
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
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  // 初始化數據
  const refreshAll = useCallback(async () => {
    setIsAutoRefreshing(true);
    try {
      const allLiveStatus = await ParkingService.getAllLiveStatus();
      
      setParkingLots(prev => {
        // 如果還沒有任何停車場（包含固定），則載入固定清單
        const baseList = prev.length > 0 ? prev : ParkingService.QUICK_ACCESS_LOTS.map(res => ({
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

        return baseList.map(lot => {
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
      if (!dbStatus) setDbStatus("連線正常");
    } catch (e) {
      console.warn("同步失敗");
    } finally {
      setTimeout(() => setIsAutoRefreshing(false), 2000);
    }
  }, [dbStatus]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 30000);
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
          occupied: Math.floor(Math.random() * result.capacity) 
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
      {/* 頂部標頭：對齊截圖 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-blue-600 tracking-tight">Taipei ParkRight</h1>
              <span className="text-[9px] text-gray-400 font-mono -mt-1">v1.0.0</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">北市府資料連線中</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 中心區域：對齊截圖 */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">台北市即時停車資訊</h2>
          <p className="text-gray-500 text-lg mb-10">
            輸入關鍵字 ( 如：信義、松山、府前 ) 即可查詢即時剩餘車位
          </p>

          <div className="max-w-2xl mx-auto relative group">
            {/* 藍色光暈效果 */}
            <div className="absolute -inset-1 bg-cyan-400 rounded-[2rem] blur-xl opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
            
            <form onSubmit={handleAddParking} className="relative bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex items-center p-2">
              <MapPin className="w-6 h-6 text-gray-300 ml-5" />
              <input 
                type="text" 
                placeholder="輸入停車場名稱或地址..." 
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
                    ? 'bg-slate-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                }`}
              >
                {searchStatus === LoadingState.SEARCHING ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>搜尋中</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>搜尋</span>
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-medium border border-red-100 flex items-center animate-bounce">
                <AlertCircle className="w-4 h-4 mr-2" />{errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* 內容顯示區 */}
        {parkingLots.length === 0 ? (
          /* 空白狀態：完全對齊截圖 */
          <div className="max-w-4xl mx-auto mt-20">
            <div className="border-2 border-dashed border-gray-200 rounded-[2.5rem] py-24 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <SearchIcon className="w-10 h-10 text-blue-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">尚未新增停車場</h3>
              <p className="text-gray-400 max-w-sm text-center px-6 leading-relaxed">
                請在上方輸入關鍵字，系統將從台北市開放資料平台取得即時資訊。
              </p>
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

      {/* 底部小提示 */}
      <footer className="mt-20 pb-10 text-center">
        <div className="inline-flex items-center space-x-4 bg-white px-6 py-3 rounded-full border border-gray-100 shadow-sm">
          <div className={`flex items-center space-x-2 text-xs ${isAutoRefreshing ? 'text-blue-500' : 'text-gray-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isAutoRefreshing ? 'bg-blue-500 animate-ping' : 'bg-gray-300'}`}></div>
            <span>{isAutoRefreshing ? '同步中...' : '每 30 秒自動更新數據'}</span>
          </div>
          <div className="h-3 w-[1px] bg-gray-200"></div>
          <p className="text-[10px] text-gray-400">數據來源：台北市政府交通局</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
