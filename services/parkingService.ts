import { SearchResult } from "../types";

// List of CORS proxies to try in order. 
// Public proxies can be flaky, so having a fallback is crucial for reliability.
const PROXY_FACTORIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

const STATIC_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json";
const LIVE_DATA_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json";

let cachedParkingDb: any[] | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Robust fetch function that tries multiple proxies if one fails.
 */
const fetchJsonWithFallback = async (targetUrl: string) => {
  for (const createProxyUrl of PROXY_FACTORIES) {
    try {
      const url = createProxyUrl(targetUrl);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`Proxy attempt failed for ${targetUrl}:`, err);
      // Continue to next proxy
    }
  }
  throw new Error("無法連接到台北市停車資訊伺服器，請檢查網路或稍後再試。");
};

/**
 * Preloads the database in the background.
 */
export const preloadDatabase = () => {
  if (!initPromise) {
    initDatabase();
  }
};

/**
 * Initializes the local database of parking lots from the API.
 */
const initDatabase = async () => {
  if (cachedParkingDb) return;
  
  // Prevent multiple simultaneous requests
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const json = await fetchJsonWithFallback(STATIC_DATA_URL);
      if (json && json.data && json.data.park) {
        cachedParkingDb = json.data.park;
      } else {
        throw new Error("資料格式錯誤 (Invalid Data Format)");
      }
    } catch (error) {
      initPromise = null; // Reset so we can try again
      console.error("Failed to fetch parking database", error);
      throw error;
    }
  })();

  return initPromise;
};

/**
 * Searches for a parking lot by name or address in the downloaded database.
 */
export const searchParking = async (query: string): Promise<SearchResult> => {
  await initDatabase();

  if (!cachedParkingDb) {
    throw new Error("資料庫載入失敗，請重整網頁再試一次。");
  }

  const q = query.trim().toLowerCase();
  
  // Simple string matching
  const match = cachedParkingDb.find((p: any) => 
    p.name.toLowerCase().includes(q) || 
    p.address.toLowerCase().includes(q)
  );

  if (!match) {
    throw new Error(`找不到符合 "${query}" 的停車場。請嘗試輸入完整的中文名稱，例如「府前廣場」。`);
  }

  return {
    id: match.id,
    name: match.name,
    address: match.address,
    rates: match.payex,
    capacity: parseInt(match.totalcar) || 0,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.name)}`,
  };
};

/**
 * Fetches the real-time available spaces for a specific parking lot ID.
 */
export const getLiveAvailability = async (id: string) => {
  try {
    // Fetch live data
    const json = await fetchJsonWithFallback(LIVE_DATA_URL);
    const parks = json.data.park;
    
    const status = parks.find((p: any) => p.id === id);
    
    if (!status) {
      // If ID is not found in live data (maintenance or error), return fallback
      return { available: 0, isFull: true }; 
    }

    // The API sometimes returns negative numbers for errors, treat as 0
    const available = Math.max(0, parseInt(status.availablecar));
    
    return {
      available,
      isFull: available === 0
    };
  } catch (error) {
    console.error("Failed to fetch live status", error);
    throw new Error("無法取得即時車位資訊");
  }
};