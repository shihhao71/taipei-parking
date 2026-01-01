
import { SearchResult } from "../types";

const PROXY_LIST = [
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

/**
 * 預設常用停車場清單
 */
export const QUICK_ACCESS_LOTS: SearchResult[] = [
  {
    id: "030", 
    name: "民生社區中心地下停車場", 
    address: "民生東路5段163-1號地下", 
    rates: "一至五(8-22)30元/時, 六日(8-22)40元/時, 夜間10元/時", 
    capacity: 305,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=民生社區中心地下停車場"
  },
  {
    id: "254", 
    name: "嘟嘟房台北小巨蛋站停車場", 
    address: "南京東路4段2號地下", 
    rates: "日間40-60元/時, 夜間10元/時 (依活動調整)", 
    capacity: 492,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=嘟嘟房台北小巨蛋站停車場"
  }
];

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

const fetchWithRetry = async (targetUrl: string) => {
  const errors: string[] = [];
  for (const proxy of PROXY_LIST) {
    try {
      const proxyUrl = proxy.fn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${proxy.name} HTTP ${response.status}`);
      const data = await response.json();
      if (data && data.data) return data;
      throw new Error("格式不正確");
    } catch (err: any) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(" | "));
};

// 只有在需要搜尋時才初始化大資料庫
export const initFullDatabase = async (onProgress?: (s: string) => void) => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (onProgress) onProgress("正在下載完整搜尋引擎...");
      const json = await fetchWithRetry(STATIC_DATA_URL);
      cachedParkingDb = json.data.park;
      if (onProgress) onProgress("搜尋引擎已就緒");
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();
  return initPromise;
};

export const searchParking = async (query: string): Promise<SearchResult> => {
  // 先在常用清單找
  const quickMatch = QUICK_ACCESS_LOTS.find(l => 
    l.name.includes(query) || l.address.includes(query)
  );
  if (quickMatch) return quickMatch;

  // 常用清單沒有，才啟動大資料庫下載
  await initFullDatabase();
  if (!cachedParkingDb) throw new Error("資料庫載入失敗");

  const q = query.trim().toLowerCase();
  const match = cachedParkingDb.find((p: any) => 
    p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );

  if (!match) throw new Error(`找不到 "${query}"。`);

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
  const json = await fetchWithRetry(LIVE_DATA_URL);
  const status = json.data.park.find((p: any) => p.id === id);
  const available = status ? Math.max(0, parseInt(status.availablecar)) : 0;
  return { available, isFull: available === 0 };
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
