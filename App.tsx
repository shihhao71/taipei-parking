
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Car, AlertCircle, LayoutDashboard, Plus } from 'lucide-react';
import { ParkingLot, LoadingState } from './types';
import * as ParkingService from './services/parkingService';
import ParkingCard from './components/ParkingCard';

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncData = useCallback(async () => {
    try {
      const allLive = await ParkingService.getAllLiveStatus();
      
      setParkingLots(prev => {
        if (prev.length === 0) {
          ParkingService.getQuickAccessLots().then(presets => {
            const list = presets.map(p => {
              const live = allLive.find(l => l.id === p.id);
              return {
                ...p,
                totalSpaces: p.capacity,
                availableSpaces: live ? Math.max(0, parseInt(live.availablecar)) : 0,
                isFull: live ? parseInt(live.availablecar) <= 0 : false,
                lastUpdated: new Date(),
                occupancyHistory: []
              };
            });
            setParkingLots(list);
          });
          return [];
        }

        return prev.map(lot => {
          const live = allLive.find(p => p.id === lot.id);
          if (!live) return lot;
          const avail = Math.max(0, parseInt(live.availablecar));
          return {
            ...lot,
            availableSpaces: avail,
            isFull: avail <= 0,
            lastUpdated: new Date()
          };
        });
      });
    } catch (e) { 
      console.warn("同步失敗"); 
    }
  }, []);

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 15000); 
    return () => clearInterval(interval);
  }, [syncData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchStatus(LoadingState.SEARCHING);
    setErrorMsg(null);

    try {
      const result = await ParkingService.searchParking(searchQuery);
      if (parkingLots.find(p => p.id === result.id)) throw new Error("此停車場已存在");
      
      const live = await ParkingService.getLiveAvailability(result.id);
      const newLot: ParkingLot = {
        ...result,
        totalSpaces: result.capacity,
        availableSpaces: live.available,
        isFull: live.isFull,
        lastUpdated: new Date(),
        occupancyHistory: []
      };
      
      setParkingLots(prev => [...prev, newLot]);
      setSearchQuery('');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSearchStatus(LoadingState.IDLE);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-black tracking-tighter">Taipei<span className="text-blue-600">Park</span></h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-6 relative">
            <input 
              type="text" 
              placeholder="輸入名稱關鍵字 (例如：小巨蛋)" 
              className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => ParkingService.initFullDatabase()}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            {errorMsg && (
              <div className="absolute top-full left-0 mt-2 bg-red-500 text-white text-[10px] py-1 px-3 rounded shadow-lg">{errorMsg}</div>
            )}
          </form>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase">Live Data</span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            停車資訊看板
          </h2>
          <p className="text-slate-400 text-sm font-bold">即時同步臺北市政府最新車位數據</p>
        </div>

        {/* 左右排列 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {parkingLots.map(lot => (
            <ParkingCard 
              key={lot.id} 
              lot={lot} 
              onRefresh={async (id) => {
                setRefreshingId(id);
                const live = await ParkingService.getLiveAvailability(id);
                setParkingLots(p => p.map(x => x.id === id ? {...x, availableSpaces: live.available, isFull: live.isFull, lastUpdated: new Date()} : x));
                setRefreshingId(null);
              }}
              onRemove={(id) => setParkingLots(p => p.filter(x => x.id !== id))}
              loading={refreshingId === lot.id}
            />
          ))}
          
          <button 
            onClick={() => document.querySelector('input')?.focus()}
            className="border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center py-12 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-all min-h-[350px]"
          >
            <Plus className="w-10 h-10 mb-2" />
            <span className="font-black text-xs uppercase tracking-widest">新增監測對象</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
