import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, MapPin, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { ParkingLot, LoadingState, SearchResult } from './types';
import * as ParkingService from './services/parkingService';
import ParkingCard from './components/ParkingCard';

const generateMockHistoryWithRealCurrent = (capacity: number, currentAvailable: number) => {
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '現在'];
  return hours.map((time, index) => {
    if (index === hours.length - 1) return { time, occupied: Math.max(0, capacity - currentAvailable) };
    return { time, occupied: Math.floor(Math.random() * (capacity * 0.9)) };
  });
};

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  useEffect(() => {
    ParkingService.preloadDatabase();
  }, []);

  useEffect(() => {
    if (parkingLots.length === 0) return;
    const autoRefresh = async () => {
      setIsAutoRefreshing(true);
      try {
        const allLiveStatus = await ParkingService.getAllLiveStatus();
        setParkingLots(prev => prev.map(lot => {
          const liveInfo = allLiveStatus.find(p => p.id === lot.id);
          if (liveInfo) {
            const available = Math.max(0, parseInt(liveInfo.availablecar));
            const occupied = lot.totalSpaces - available;
            const newHistory = [...lot.occupancyHistory.slice(1), { 
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
              occupied: Math.max(0, occupied)
            }];
            return { ...lot, availableSpaces: available, isFull: available === 0, lastUpdated: new Date(), occupancyHistory: newHistory };
          }
          return lot;
        }));
      } catch (err) {
        console.warn("[AutoRefresh] 自動同步失敗");
      } finally {
        setTimeout(() => setIsAutoRefreshing(false), 2000);
      }
    };
    const timer = setInterval(autoRefresh, 30000);
    return () => clearInterval(timer);
  }, [parkingLots.length]);

  const handleAddParking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus(LoadingState.SEARCHING);
    setErrorMsg(null);
    setShowDebug(false);

    try {
      const result: SearchResult = await ParkingService.searchParking(searchQuery);
      if (parkingLots.some(p => p.id === result.id)) {
        setErrorMsg("此停車場已在追蹤列表中。");
        setSearchStatus(LoadingState.IDLE);
        return;
      }

      const liveData = await ParkingService.getLiveAvailability(result.id);
      const newLot: ParkingLot = {
        id: result.id,
        name: result.name,
        address: result.address,
        rates: result.rates,
        mapUrl: result.mapUrl,
        totalSpaces: result.capacity,
        availableSpaces: liveData.available,
        isFull: liveData.isFull,
        lastUpdated: new Date(),
        occupancyHistory: generateMockHistoryWithRealCurrent(result.capacity, liveData.available)
      };

      setParkingLots(prev => [newLot, ...prev]);
      setSearchQuery('');
      setSearchStatus(LoadingState.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setSearchStatus(LoadingState.ERROR);
      setErrorMsg(error.message || "發生未知錯誤");
    } finally {
      setTimeout(() => { if (searchStatus !== LoadingState.ERROR) setSearchStatus(LoadingState.IDLE); }, 2000);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      const liveData = await ParkingService.getLiveAvailability(id);
      setParkingLots(prev => prev.map(p => {
        if (p.id === id) {
          const occupied = p.totalSpaces - liveData.available;
          const newHistory = [...p.occupancyHistory.slice(1), { 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
            occupied: Math.max(0, occupied)
          }];
          return { ...p, availableSpaces: liveData.available, isFull: liveData.isFull, lastUpdated: new Date(), occupancyHistory: newHistory };
        }
        return p;
      }));
    } catch (error: any) {
      alert("手動重新整理失敗: " + error.message);
    }
    setRefreshingId(null);
  };

  const handleRemove = (id: string) => {
    setParkingLots(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-800 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Car className="w-6 h-6 text-white" /></div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Taipei ParkRight</h1>
          </div>
          <div className="flex items-center">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-500 ${isAutoRefreshing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isAutoRefreshing ? 'bg-blue-500 animate-spin' : 'bg-green-500 animate-pulse'}`}></div>
              <span className="text-xs font-medium">{isAutoRefreshing ? '同步中...' : '30s 自動同步已啟動'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="max-w-2xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">台北市即時停車查詢</h2>
            <p className="mt-2 text-gray-500">搜尋停車場名稱或路名（例如：松山、南京、大安）</p>
          </div>

          <form onSubmit={handleAddParking} className="relative group z-10">
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 ${searchStatus === LoadingState.SEARCHING ? 'opacity-60' : ''}`}></div>
            <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2 border border-gray-100">
              <MapPin className="w-6 h-6 text-gray-400 ml-3" />
              <input 
                type="text" 
                placeholder="輸入停車場關鍵字..." 
                className="flex-grow p-4 text-gray-700 focus:outline-none bg-transparent font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchStatus === LoadingState.SEARCHING}
              />
              <button 
                type="submit"
                disabled={searchStatus === LoadingState.SEARCHING || !searchQuery}
                className={`px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 flex items-center shadow-md min-w-[120px] justify-center ${searchStatus === LoadingState.SEARCHING ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'}`}
              >
                {searchStatus === LoadingState.SEARCHING ? <RefreshCw className="animate-spin h-5 w-5" /> : <><Plus className="w-5 h-5 mr-1" />搜尋</>}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 animate-fade-in-down">
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-start justify-between">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg.split('\n')[0]}</span>
                </div>
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className="ml-2 text-xs font-bold underline hover:text-red-900 flex items-center"
                >
                  {showDebug ? <><ChevronUp className="w-3 h-3 mr-1"/>隱藏</> : <><ChevronDown className="w-3 h-3 mr-1"/>詳細資訊</>}
                </button>
              </div>
              {showDebug && (
                <div className="mt-2 p-4 bg-gray-900 text-green-400 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre border border-gray-700 shadow-inner">
                  # 診斷資訊回報：<br/>
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {parkingLots.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="w-10 h-10 text-blue-300" /></div>
            <h3 className="text-xl font-bold text-gray-900">尚未新增停車場</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">請在上方搜尋並新增停車場，系統將每 30 秒自動更新車位。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map(lot => (
              <ParkingCard key={lot.id} lot={lot} onRefresh={handleRefresh} onRemove={handleRemove} loading={refreshingId === lot.id} />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Taipei ParkRight. 資料來源：臺北市資料大平臺</p>
        </div>
      </footer>
    </div>
  );
}

export default App;