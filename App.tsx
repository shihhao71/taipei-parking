
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Car, AlertCircle, LayoutDashboard, Plus, Loader2, RefreshCw, Zap } from 'lucide-react';
import { ParkingLot, LoadingState } from './types';
import * as ParkingService from './services/parkingService';
import ParkingCard from './components/ParkingCard';

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([
    {
      id: 'TPE0054',
      name: '民生社區中心地下停車場',
      address: '臺北市松山區民生東路5段163-1號',
      rates: '載入中...',
      totalSpaces: 0,
      availableSpaces: 0,
      lastUpdated: new Date(),
      isFull: false,
      isPinned: true,
      occupancyHistory: []
    },
    {
      id: 'TPE0476',
      name: '嘟嘟房台北小巨蛋站停車場',
      address: '臺北市松山區南京東路4段2號',
      rates: '載入中...',
      totalSpaces: 0,
      availableSpaces: 0,
      lastUpdated: new Date(),
      isFull: false,
      isPinned: true,
      occupancyHistory: []
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initialized = useRef(false);

  const refreshAllData = useCallback(async (isInitial = false) => {
    if (isInitial) setSearchStatus(LoadingState.SEARCHING);
    try {
      await ParkingService.initFullDatabase();
      const presets = await ParkingService.getQuickAccessLots();
      const allLive = await ParkingService.getAllLiveStatus();
      
      setParkingLots(prev => prev.map(lot => {
        const staticInfo = presets.find(p => p.id === lot.id);
        const liveInfo = allLive.find(l => l.id === lot.id);
        
        const total = staticInfo ? staticInfo.capacity : (liveInfo ? parseInt(liveInfo.totalcar) : lot.totalSpaces);
        const avail = liveInfo ? Math.max(0, parseInt(liveInfo.availablecar)) : lot.availableSpaces;
        
        return {
          ...lot,
          name: staticInfo?.name || lot.name,
          address: staticInfo?.address || lot.address,
          rates: staticInfo?.rates || lot.rates,
          totalSpaces: total || 0,
          availableSpaces: avail,
          isFull: avail <= 0,
          lastUpdated: new Date(),
          mapUrl: staticInfo?.mapUrl || lot.mapUrl
        };
      }));

      setSearchStatus(LoadingState.IDLE);
      setErrorMsg(null);
    } catch (e: any) {
      console.error("Refresh failed:", e);
      setErrorMsg("同步失敗：" + e.message);
      setSearchStatus(LoadingState.ERROR);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      refreshAllData(true);
      initialized.current = true;
    }
    const interval = setInterval(() => refreshAllData(false), 20000); 
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    
    setSearchStatus(LoadingState.SEARCHING);
    setErrorMsg(null);

    try {
      const result = await ParkingService.searchParking(q);
      if (parkingLots.find(p => p.id === result.id)) {
        throw new Error("此停車場已在清單中");
      }
      const live = await ParkingService.getLiveAvailability(result.id);
      
      const newLot: ParkingLot = {
        ...result,
        totalSpaces: result.capacity,
        availableSpaces: live.available,
        isFull: live.isFull,
        lastUpdated: new Date(),
        occupancyHistory: []
      };
      
      setParkingLots(prev => [newLot, ...prev]);
      setSearchQuery('');
      setSearchStatus(LoadingState.IDLE);
    } catch (e: any) {
      setErrorMsg(e.message);
      setSearchStatus(LoadingState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      {/* Header with Color Gradient */}
      <div className="bg-slate-900 h-64 w-full absolute top-0 left-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 to-transparent"></div>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-blue-900/20">
              <Car className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white">臺北泊車 <span className="text-blue-400">Live</span></h1>
              <p className="text-xs font-black text-blue-300/60 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Real-time Data Visualization
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-xl group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-[1.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <input
                type="text"
                placeholder="輸入關鍵字搜尋停車場 (例: 小巨蛋, 民生...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-[1.2rem] py-4.5 pl-14 pr-6 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                disabled={searchStatus === LoadingState.SEARCHING}
              >
                {searchStatus === LoadingState.SEARCHING ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </header>

        {errorMsg && (
          <div className="bg-red-500 text-white rounded-2xl p-4 mb-8 flex items-center gap-3 animate-bounce shadow-xl shadow-red-200">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span className="text-sm font-black">{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-10">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-black text-white uppercase tracking-widest">我的監控列表</h2>
          </div>
          <div className="h-px bg-white/10 flex-1" />
          <button 
            onClick={() => refreshAllData()} 
            className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5 uppercase tracking-widest"
          >
            <RefreshCw className="w-3 h-3" /> 手動刷新
          </button>
        </div>

        {/* 一行兩個佈局: lg:grid-cols-2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {parkingLots.map(lot => (
            <ParkingCard 
              key={lot.id} 
              lot={lot} 
              onRefresh={id => {
                setRefreshingId(id);
                ParkingService.getLiveAvailability(id).then(live => {
                  setParkingLots(prev => prev.map(x => x.id === id ? {...x, availableSpaces: live.available, isFull: live.isFull, lastUpdated: new Date()} : x));
                  setRefreshingId(null);
                });
              }}
              onRemove={id => setParkingLots(prev => prev.filter(x => x.id !== id))}
              loading={refreshingId === lot.id}
            />
          ))}

          <button 
            onClick={() => document.querySelector('input')?.focus()}
            className="group relative border-4 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center py-20 text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-all min-h-[400px]"
          >
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-50 transition-all duration-500">
              <Plus className="w-10 h-10" />
            </div>
            <span className="font-black text-sm uppercase tracking-[0.3em]">新增追蹤停車場</span>
            <p className="mt-2 text-xs opacity-50 font-bold italic">Click to focus search</p>
          </button>
        </div>
      </div>
      
      <footer className="mt-20 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Taipei City Open Data Integration</p>
      </footer>
    </div>
  );
}

export default App;
