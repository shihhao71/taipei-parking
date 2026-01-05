
import { SearchResult } from "../types";

// 使用更穩定的代理，CodeTabs 對於較大的 JSON 檔案支援度較佳
const PROXY_LIST = [
  { name: "CodeTabs", fn: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` }
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

export const PRESET_IDS = ["TPE0054", "TPE0476"];

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

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
      const data = await response.json();
      
      // 北市府資料格式通常在 data.park 或 data.data.park
      if (data && data.data && data.data.park) return data;
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

export const getLiveAvailability = async (id: string) => {
  try {
    const json = await fetchWithRetry(LIVE_DATA_URL);
    const status = json.data.park.find((p: any) => p.id === id);
    const available = status ? parseInt(status.availablecar) : 0;
    return { 
      available: isNaN(available) ? 0 : Math.max(0, available), 
      isFull: available <= 0 
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
