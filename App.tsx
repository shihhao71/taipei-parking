
import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, MapPin, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Database, Star } from 'lucide-react';
import { ParkingLot, LoadingState, SearchResult } from './types';
import * as ParkingService from './services/parkingService';
import ParkingCard from './components/ParkingCard';

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  // 1. 初始化：載入常用清單
  useEffect(() => {
    const loadQuickAccess = async () => {
      if (ParkingService.QUICK_ACCESS_LOTS.length === 0) return;
      
      try {
        const allLiveStatus = await ParkingService.getAllLiveStatus();
        const initialLots: ParkingLot[] = ParkingService.QUICK_ACCESS_LOTS.map(res => {
          const live = allLiveStatus.find(p => p.id === res.id);
          const available = live ? Math.max(0, parseInt(live.availablecar)) : 0;
          return {
            ...res,
            availableSpaces: available,
            totalSpaces: res.capacity,
            isFull: available === 0,
            lastUpdated: new Date(),
            occupancyHistory: Array(7).fill(0).map((_, i) => ({ 
              time: `${8 + i * 2}:00`, 
              occupied: Math.floor(Math.random() * res.capacity) 
            }))
          };
        });
        setParkingLots(initialLots);
      } catch (e) {
        console.warn("常用清單即時更新失敗，將顯示預設值");
      }
    };
    loadQuickAccess();
  }, []);

  // 2. 自動同步邏輯 (每30秒)
  useEffect(() => {
    if (parkingLots.length === 0) return;
    const timer = setInterval(async () => {
      setIsAutoRefreshing(true);
      try {
        const allLiveStatus = await ParkingService.getAllLiveStatus();
        setParkingLots(prev => prev.map(lot => {
          const liveInfo = allLiveStatus.find(p => p.id === lot.id);
          if (liveInfo) {
            const available = Math.max(0, parseInt(liveInfo.availablecar));
            return { ...lot, availableSpaces: available, isFull: available === 0, lastUpdated: new Date() };
          }
          return lot;
        }));
      } finally {
        setTimeout(() => setIsAutoRefreshing(false), 2000);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [parkingLots.length]);

  // 3. 搜尋邏輯
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

      setParkingLots(prev => [newLot, ...prev]);
      setSearchQuery('');
      setSearchStatus(LoadingState.SUCCESS);
    } catch (error: any) {
      setSearchStatus(LoadingState.ERROR);
      setErrorMsg(error.message);
    } finally {
      setTimeout(() => setSearchStatus(LoadingState.IDLE), 2000);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      const liveData = await ParkingService.getLiveAvailability(id);
      setParkingLots(prev => prev.map(p => p.id === id ? { ...p, availableSpaces: liveData.available, isFull: liveData.isFull, lastUpdated: new Date() } : p));
    } catch (e: any) { alert("更新失敗: " + e.message); }
    setRefreshingId(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Car className="w-5 h-5 text-white" /></div>
            <h1 className="text-lg font-bold text-gray-900">Taipei ParkRight</h1>
          </div>
          <div className="flex items-center space-x-3">
            {dbStatus && (
              <div className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full border border-amber-100 flex items-center">
                <Database className="w-3 h-3 mr-1" /> {dbStatus}
              </div>
            )}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${isAutoRefreshing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isAutoRefreshing ? 'bg-blue-500 animate-spin' : 'bg-green-500 animate-pulse'}`}></div>
              <span>{isAutoRefreshing ? '同步中' : '30s 自動同步'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-10">
          <form onSubmit={handleAddParking} className="relative group">
            <div className="absolute inset-0 bg-blue-400 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition"></div>
            <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center p-1.5">
              <MapPin className="w-5 h-5 text-gray-400 ml-3" />
              <input 
                type="text" 
                placeholder="搜尋新停車場..." 
                className="flex-grow p-3 text-sm focus:outline-none"
                value={searchQuery}
                onFocus={() => ParkingService.initFullDatabase(setDbStatus)}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={searchStatus === LoadingState.SEARCHING}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center"
              >
                {searchStatus === LoadingState.SEARCHING ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />搜尋</>}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
              <div className="flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{errorMsg}</div>
              <button onClick={() => setShowDebug(!showDebug)} className="underline font-bold ml-2">詳細</button>
            </div>
          )}
          {showDebug && <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded-xl font-mono text-[10px] overflow-auto max-h-32">{errorMsg}</div>}
        </div>

        {parkingLots.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">請輸入停車場名稱開始追蹤</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map(lot => (
              <ParkingCard key={lot.id} lot={lot} onRefresh={handleRefresh} onRemove={(id) => setParkingLots(p => p.filter(x => x.id !== id))} loading={refreshingId === lot.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
