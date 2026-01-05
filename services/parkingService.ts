
import { SearchResult } from "../types";

// 擴展代理伺服器列表，增加成功率
const PROXY_LIST = [
  { name: "Direct", fn: (url: string) => `${url}?nocache=${Date.now()}` },
  { name: "CorsProxy.io", fn: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url + "?cb=" + Date.now())}` },
  { name: "CodeTabs", fn: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url + "?t=" + Date.now())}` },
  { name: "AllOrigins", fn: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url + "?t=" + Date.now())}` },
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

/**
 * 固定停車場設定
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
      const fetchUrl = proxy.fn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 縮短超時時間，快速切換下一個代理
      
      const response = await fetch(fetchUrl, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${proxy.name} 狀態碼 ${response.status}`);
      
      const data = await response.json();
      if (data && data.data) {
        console.log(`[ParkingService] 資料抓取成功 來源: ${proxy.name}`);
        return data;
      }
      throw new Error(`${proxy.name} 資料內容格式不符`);
    } catch (err: any) {
      console.warn(`[ParkingService] ${proxy.name} 失敗: ${err.message}`);
      errors.push(`${proxy.name}: ${err.message}`);
    }
  }
  
  throw new Error("目前無法連線至台北市停車伺服器。請檢查網路或稍後再試。原因: " + errors.slice(-1)[0]);
};

export const initFullDatabase = async (onProgress?: (s: string) => void) => {
  if (cachedParkingDb) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (onProgress) onProgress("連線中...");
      const json = await fetchWithRetry(STATIC_DATA_URL);
      cachedParkingDb = json.data.park;
      if (onProgress) onProgress("已連線");
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();
  return initPromise;
};

export const searchParking = async (query: string): Promise<SearchResult> => {
  await initFullDatabase();
  if (!cachedParkingDb) throw new Error("停車場資料庫載入失敗");

  const q = query.trim().toLowerCase();
  const match = cachedParkingDb.find((p: any) => 
    p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );

  if (!match) throw new Error(`找不到符合 "${query}" 的停車場。`);

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
    let available = status ? parseInt(status.availablecar) : 0;
    if (isNaN(available) || available < 0) available = 0;
    return { available, isFull: available === 0 };
  } catch (e) {
    throw new Error("無法取得即時位子資訊");
  }
};

export const getAllLiveStatus = async () => {
  const json = await fetchWithRetry(LIVE_DATA_URL);
  return json.data.park as any[];
};
