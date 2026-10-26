
import { SearchResult } from "../types";

// 資料來源優先序：
// 1. 本站 nginx 反向代理 /parking-api/（同源，無 CORS 問題，有 60 秒快取）
// 2. 以下三個免費公用 proxy 僅作備援 —— 2026-08 曾三個同時失效導致完全無法同步，
//    不可再拿它們當主要來源
const PROXY_LIST = [
  { name: "SameOrigin", fn: (url: string) => `/parking-api/${url.split("/").pop()}` },
  { name: "CodeTabs", fn: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` }
];

// 2026-10 北市府的 .json 版自 10/21 起停止更新（資料停在 10/19），
// 資料大平臺目前只列 .xml 版，且 .xml 每分鐘更新 —— 改讀 .xml
const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.xml";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.xml";

export const PRESET_IDS = ["TPE0054", "TPE0476"];

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

// 把北市府 XML 轉成與舊 JSON 相同的結構 { data: { UPDATETIME, park: [...] } }
// 只取 <PARK> 底下的單層欄位，欄名轉小寫（ID→id、AVAILABLECAR→availablecar、PAYEX→payex）
const parseParkXml = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML 解析失敗");
  const park = Array.from(doc.getElementsByTagName("PARK")).map(el => {
    const o: any = {};
    for (const c of Array.from(el.children)) {
      if (c.children.length === 0) o[c.tagName.toLowerCase()] = c.textContent ?? "";
    }
    return o;
  });
  const updatetime = doc.getElementsByTagName("UPDATETIME")[0]?.textContent ?? "";
  return { data: { UPDATETIME: updatetime, park } };
};

const fetchWithRetry = async (targetUrl: string) => {
  let lastError = null;
  for (const proxy of PROXY_LIST) {
    try {
      console.log(`Trying proxy: ${proxy.name} for ${targetUrl}`);
      // 移除所有 Headers 以避免觸發部分代理伺服器的 CORS Preflight 限制
      const response = await fetch(proxy.fn(targetUrl));
      if (!response.ok) {
        console.warn(`Proxy ${proxy.name} returned status ${response.status}`);
        continue;
      }
      const text = await response.text();
      const data = text.trimStart().startsWith("<") ? parseParkXml(text) : JSON.parse(text);

      // 北市府資料格式通常在 data.park 或 data.data.park
      if (data && data.data && data.data.park && data.data.park.length) return data;
      if (data && data.park) return { data }; // 兼容某些代理直接回傳內容的格式

      console.warn(`Proxy ${proxy.name} returned invalid format`);
    } catch (e) {
      lastError = e;
      console.error(`Proxy ${proxy.name} failed:`, e);
      continue;
    }
  }
  throw lastError || new Error("無法從臺北市政府取得資料，請檢查網路連線。");
};

export const initFullDatabase = async () => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const json = await fetchWithRetry(STATIC_DATA_URL);
      cachedParkingDb = json.data.park;
      console.log("Parking Database Initialized:", cachedParkingDb?.length);
    } catch (e) {
      initPromise = null;
      throw e;
    }
  })();
  return initPromise;
};

export const getQuickAccessLots = async (): Promise<SearchResult[]> => {
  await initFullDatabase();
  if (!cachedParkingDb) return [];

  return PRESET_IDS.map(id => {
    const p = cachedParkingDb!.find(item => item.id === id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      rates: p.payex || "依現場公告",
      capacity: parseInt(p.totalcar) || 0,
      isPinned: true,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`
    };
  }).filter(Boolean) as SearchResult[];
};

export const searchParking = async (query: string): Promise<SearchResult> => {
  await initFullDatabase();
  if (!cachedParkingDb) throw new Error("資料庫載入中，請稍候再試");

  const q = query.trim().toLowerCase();
  // 優先嘗試精確匹配名稱，再嘗試包含匹配
  let match = cachedParkingDb.find(p => p.name.toLowerCase() === q);
  if (!match) {
    match = cachedParkingDb.find(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }

  if (!match) throw new Error(`找不到包含「${query}」的停車場`);

  return {
    id: match.id,
    name: match.name,
    address: match.address,
    rates: match.payex || "依現場公告",
    capacity: parseInt(match.totalcar) || 0,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.name)}`,
  };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 解析北市府 UPDATETIME，例："Mon Oct 26 21:00:00 CST 2026"
// 這裡的 CST 是台灣時間 UTC+8（不是美國中部時間），不能直接丟給 Date.parse
export const parseUpdateTime = (s: string): Date | null => {
  const m = (s || "").trim().match(/^\w{3} (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) \w+ (\d{4})$/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[1]);
  if (mon < 0) return null;
  return new Date(Date.UTC(+m[6], mon, +m[2], +m[3] - 8, +m[4], +m[5]));
};

// 即時車位整包 + 北市府資料本身的時間（用來判斷來源是否停止更新）
export const getLiveSnapshot = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return { park: json.data.park as any[], dataTime: parseUpdateTime(json.data.UPDATETIME) };
};

export const getLiveAvailability = async (id: string) => {
  try {
    const { park, dataTime } = await getLiveSnapshot();
    const status = park.find((p: any) => p.id === id);
    const available = status ? parseInt(status.availablecar) : 0;
    return {
      available: isNaN(available) ? 0 : Math.max(0, available),
      isFull: available <= 0,
      dataTime
    };
  } catch (e) {
    console.error("Failed to fetch live availability for", id, e);
    throw e;
  }
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
