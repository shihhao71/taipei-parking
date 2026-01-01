import { SearchResult } from "../types";

/**
 * 跨網域代理清單 - 增加多個備援節點
 */
const PROXY_LIST = [
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
  { name: "CodeTabs", fn: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

const fetchWithRetry = async (targetUrl: string) => {
  const errors: string[] = [];

  for (const proxy of PROXY_LIST) {
    try {
      const proxyUrl = proxy.fn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 增加到 12 秒

      console.log(`[ParkingService] 嘗試使用 ${proxy.name} 連線...`);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${proxy.name} 回報 HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.data) {
        console.log(`[ParkingService] ${proxy.name} 連線成功!`);
        return data;
      }
      throw new Error(`${proxy.name} 回傳格式不正確`);
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? `${proxy.name} 連線逾時` : err.message;
      console.warn(`[ParkingService] ${proxy.name} 失敗:`, msg);
      errors.push(msg);
    }
  }
  
  throw new Error(`所有代理伺服器皆連線失敗：\n- ${errors.join('\n- ')}`);
};

export const preloadDatabase = () => {
  if (!initPromise) {
    initDatabase().catch(err => console.error("資料庫預載失敗", err));
  }
};

const initDatabase = async () => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const json = await fetchWithRetry(STATIC_DATA_URL);
      if (json && json.data && json.data.park) {
        cachedParkingDb = json.data.park;
      } else {
        throw new Error("無法解析停車場靜態資料包");
      }
    } catch (error: any) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

export const searchParking = async (query: string): Promise<SearchResult> => {
  await initDatabase();
  if (!cachedParkingDb) {
    throw new Error("停車場資料庫尚未下載完成，請稍候。若持續失敗，可能是台北市政府 API 被封鎖。");
  }

  const q = query.trim().toLowerCase();
  const match = cachedParkingDb.find((p: any) => 
    p.name.toLowerCase().includes(q) || 
    p.address.toLowerCase().includes(q)
  );

  if (!match) {
    throw new Error(`找不到包含 "${query}" 的停車場，建議嘗試縮短關鍵字（例如：只輸入路名）。`);
  }

  return {
    id: match.id,
    name: match.name,
    address: match.address,
    rates: match.payex || "依現場公告為準",
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