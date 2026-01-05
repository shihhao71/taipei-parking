
import { SearchResult } from "../types";

const PROXY_LIST = [
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url + "?cb=" + Date.now())}` },
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url + "?t=" + Date.now())}` },
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

/**
 * 這兩個是您指定的固定停車場
 */
export const QUICK_ACCESS_LOTS: SearchResult[] = [
  {
    id: "030", 
    name: "民生社區中心地下停車場", 
    address: "民生東路5段163-1號地下", 
    rates: "一至五(8-22)30元/時, 六日(8-22)40元/時, 夜間10元/時", 
    capacity: 305,
    isPinned: true,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=民生社區中心地下停車場"
  },
  {
    id: "723", 
    name: "嘟嘟房台北小巨蛋站停車場", 
    address: "南京東路4段103號地下", 
    rates: "日間約60元/時, 視活動調整", 
    capacity: 45,
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
      const proxyUrl = proxy.fn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${proxy.name} HTTP ${response.status}`);
      const data = await response.json();
      if (data && data.data) return data;
      throw new Error("數據格式錯誤");
    } catch (err: any) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(" | "));
};

export const initFullDatabase = async (onProgress?: (s: string) => void) => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (onProgress) onProgress("更新搜尋引擎...");
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
  let available = status ? parseInt(status.availablecar) : 0;
  if (isNaN(available) || available < 0) available = 0;
  return { available, isFull: available === 0 };
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
