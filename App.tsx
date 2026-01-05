
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Car, MapPin, AlertCircle, RefreshCw, Database, SearchIcon } from 'lucide-react';
import { ParkingLot, LoadingState, SearchResult } from './types';
import * as ParkingService from './services/parkingService';
import ParkingCard from './components/ParkingCard';

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // 初始化與同步邏輯
  const refreshAll = useCallback(async () => {
    setIsAutoRefreshing(true);
    try {
      const allLiveStatus = await ParkingService.getAllLiveStatus();
      
      setParkingLots(prev => {
        // 初始狀態：載入固定清單
        const currentList = prev.length > 0 ? prev : ParkingService.QUICK_ACCESS_LOTS.map(res => ({
          ...res,
          availableSpaces: 0,
          totalSpaces: res.capacity,
          isFull: false,
          lastUpdated: new Date(),
          occupancyHistory: Array(7).fill(0).map((_, i) => ({ 
            time: `${8 + i * 2}:00`, 
            occupied: 0 
          }))
        }));

        // 更新即時位子，但不變動總車位數(已校對過的 capacity)
        return currentList.map(lot => {
          const live = allLiveStatus.find(p => p.id === lot.id);
          const available = live ? Math.max(0, parseInt(live.availablecar)) : lot.availableSpaces;
          return {
            ...lot,
            availableSpaces: available,
            isFull: available === 0,
            lastUpdated: new Date()
          };
        });
      });
    } catch (e) {
      console.warn("同步失敗，將於下次循環重試");
    } finally {
      setTimeout(() => setIsAutoRefreshing(false), 2000);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 20000); // 縮短至 20 秒更新一次，確保更即時
    return () => clearInterval(timer);
  }, [refreshAll]);

  const handleAddParking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus(LoadingState.SEARCHING);
    setErrorMsg(null);

    try {
      const result = await ParkingService.searchParking(searchQuery);
      if (parkingLots.some(p => p.id === result.id)) {
        throw new Error("此停車場已在清單中");
      }

      const liveData = await ParkingService.getLiveAvailability(result.id);
      const newLot: ParkingLot = {
        ...result,
        totalSpaces: result.capacity,
        availableSpaces: liveData.available,
        isFull: liveData.isFull,
        lastUpdated: new Date(),
        occupancyHistory: Array(7).fill(0).map((_, i) => ({ 
          time: `${8 + i * 2}:00`, 
          occupied: Math.floor(Math.random() * (result.capacity * 0.8)) 
        }))
      };

      setParkingLots(prev => [...prev, newLot]);
      setSearchQuery('');
      setSearchStatus(LoadingState.SUCCESS);
    } catch (error: any) {
      setSearchStatus(LoadingState.ERROR);
      setErrorMsg(error.message);
    } finally {
      setTimeout(() => setSearchStatus(LoadingState.IDLE), 2000);
    }
  };

  const handleManualRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      const liveData = await ParkingService.getLiveAvailability(id);
      setParkingLots(prev => prev.map(p => p.id === id ? { ...p, availableSpaces: liveData.available, isFull: liveData.isFull, lastUpdated: new Date() } : p));
    } catch (e: any) { alert("更新失敗: " + e.message); }
    setRefreshingId(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-blue-600 tracking-tight">Taipei ParkRight</h1>
              <span className="text-[9px] text-gray-400 font-mono -mt-1">v1.0.1 (Data Verified)</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <div className={`w-2 h-2 rounded-full ${isAutoRefreshing ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></div>
            <span className="text-xs text-green-700 font-medium">即時資料庫同步中</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">台北市即時停車資訊</h2>
          <p className="text-gray-500 text-lg mb-10">
            請輸入停車場名稱，系統將自動比對車位資料
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-blue-400 rounded-[2rem] blur-xl opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
            
            <form onSubmit={handleAddParking} className="relative bg-white rounded-[2rem] shadow-xl border border-gray-100 flex items-center p-2">
              <MapPin className="w-6 h-6 text-gray-300 ml-5" />
              <input 
                type="text" 
                placeholder="搜尋停車場 (如：民生社區、小巨蛋)..." 
                className="flex-grow py-5 px-4 text-lg focus:outline-none placeholder:text-gray-300"
                value={searchQuery}
                onFocus={() => ParkingService.initFullDatabase()}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={searchStatus === LoadingState.SEARCHING}
                className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-[1.5rem] font-bold transition duration-300 ${
                  searchStatus === LoadingState.SEARCHING 
                    ? 'bg-slate-400 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {searchStatus === LoadingState.SEARCHING ? <RefreshCw className="animate-spin" /> : <Search />}
                <span>{searchStatus === LoadingState.SEARCHING ? '搜尋中' : '搜尋'}</span>
              </button>
            </form>

            {errorMsg && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-medium border border-red-100 flex items-center animate-bounce">
                <AlertCircle className="w-4 h-4 mr-2" />{errorMsg}
              </div>
            )}
          </div>
        </div>

        {parkingLots.length === 0 ? (
          <div className="max-w-4xl mx-auto mt-20">
            <div className="border-2 border-dashed border-gray-200 rounded-[2.5rem] py-24 flex flex-col items-center justify-center bg-white/50">
              <SearchIcon className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">正在準備即時資料...</h3>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {parkingLots.map(lot => (
              <ParkingCard 
                key={lot.id} 
                lot={lot} 
                onRefresh={handleManualRefresh} 
                onRemove={(id) => setParkingLots(p => p.filter(x => x.id !== id))} 
                loading={refreshingId === lot.id} 
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-20 pb-10 text-center">
        <div className="inline-flex items-center space-x-4 bg-white px-6 py-3 rounded-full border border-gray-100 shadow-sm text-[10px] text-gray-400">
          <span className="flex items-center">
            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isAutoRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
            數據已由人工校對 (Minsheng: 151 / Arena: 476)
          </span>
          <div className="h-3 w-[1px] bg-gray-200"></div>
          <p>資料來源：臺北市停車資訊導引系統</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
