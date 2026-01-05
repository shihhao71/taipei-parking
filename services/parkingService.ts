
import { SearchResult } from "../types";

// 擴展代理伺服器列表
const PROXY_LIST = [
  { name: "Direct", fn: (url: string) => `${url}?nocache=${Date.now()}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url + "?cb=" + Date.now())}` },
  { name: "CodeTabs", fn: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url + "?t=" + Date.now())}` },
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

/**
 * 權威資料校對層：確保特定停車場的靜態資料絕對正確
 * 解決政府 API 欄位可能存在的過時或錯誤問題
 */
const CAPACITY_OVERRIDES: Record<string, number> = {
  "030": 151, // 民生社區中心地下停車場
  "723": 476, // 嘟嘟房台北小巨蛋站停車場
};

/**
 * 固定停車場設定
 */
export const QUICK_ACCESS_LOTS: SearchResult[] = [
  {
    id: "030", 
    name: "民生社區中心地下停車場", 
    address: "民生東路5段163-1號地下", 
    rates: "一至五(8-22)30元/時, 六日(8-22)40元/時, 夜間10元/時", 
    capacity: CAPACITY_OVERRIDES["030"],
    isPinned: true,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=民生社區中心地下停車場"
  },
  {
    id: "723", 
    name: "嘟嘟房台北小巨蛋站停車場", 
    address: "南京東路4段103號地下", 
    rates: "全時段 60元/時, 視小巨蛋活動調整", 
    capacity: CAPACITY_OVERRIDES["723"],
    isPinned: true,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=嘟嘟房(小巨蛋站)"
  }
];

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

const fetchWithRetry = async (targetUrl: string) => {
  const errors: string[] = [];
  for (const proxy of PROXY_LIST) {
    try {
      const fetchUrl = proxy.fn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); 
      
      const response = await fetch(fetchUrl, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' } 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${proxy.name} 狀態碼 ${response.status}`);
      const data = await response.json();
      if (data && data.data) return data;
    } catch (err: any) {
      errors.push(`${proxy.name}: ${err.message}`);
    }
  }
  throw new Error("無法取得資料，請檢查網路連線。");
};

export const initFullDatabase = async () => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const json = await fetchWithRetry(STATIC_DATA_URL);
    cachedParkingDb = json.data.park;
  })();
  return initPromise;
};

export const searchParking = async (query: string): Promise<SearchResult> => {
  await initFullDatabase();
  if (!cachedParkingDb) throw new Error("資料庫載入中，請稍候再試。");

  const q = query.trim().toLowerCase();
  
  // 優先進行精準名稱匹配
  let match = cachedParkingDb.find((p: any) => p.name.toLowerCase() === q);
  
  // 若無精準匹配，則進行模糊匹配
  if (!match) {
    match = cachedParkingDb.find((p: any) => 
      p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    );
  }

  if (!match) throw new Error(`找不到 "${query}"。請試試其他關鍵字，如「民生」或「小巨蛋」。`);

  // 套用 Overrides
  const finalCapacity = CAPACITY_OVERRIDES[match.id] || parseInt(match.totalcar) || 0;

  return {
    id: match.id,
    name: match.name,
    address: match.address,
    rates: match.payex || "依現場公告",
    capacity: finalCapacity,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.name)}`,
  };
};

export const getLiveAvailability = async (id: string) => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  const status = json.data.park.find((p: any) => p.id === id);
  let available = status ? parseInt(status.availablecar) : 0;
  if (isNaN(available) || available < 0) available = 0;
  return { available, isFull: available === 0 };
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
