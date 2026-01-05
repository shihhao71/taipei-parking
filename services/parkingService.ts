
import { SearchResult } from "../types";

const PROXY_LIST = [
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url + "?t=" + Date.now())}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url + "?cb=" + Date.now())}` }
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

/**
 * 使用您提供的官方正確 ID
 * TPE0054: 民生社區中心地下停車場
 * TPE0476: 嘟嘟房台北小巨蛋站
 */
const PRESET_IDS = ["TPE0054", "TPE0476"];

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

const fetchWithRetry = async (targetUrl: string) => {
  let lastError = null;
  for (const proxy of PROXY_LIST) {
    try {
      const response = await fetch(proxy.fn(targetUrl), { 
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && data.data) return data;
    } catch (e) { 
      lastError = e;
      continue; 
    }
  }
  throw lastError || new Error("無法讀取北市府資料，請檢查網路連線");
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
  const q = query.trim().toLowerCase();
  
  const match = cachedParkingDb?.find(p => p.name.includes(q) || p.address.includes(q));
  if (!match) throw new Error("找不到該停車場");

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
  const available = status ? parseInt(status.availablecar) : 0;
  return { 
    available: isNaN(available) ? 0 : Math.max(0, available), 
    isFull: available <= 0 
  };
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
