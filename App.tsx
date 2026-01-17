
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
      setErrorMsg("資料連線不穩定，正在嘗試自動重連...");
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
        throw new Error("此停車場已在監控中");
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
    <div className="min-h-screen font-sans pb-32">
      {/* 頂部裝飾背景 */}
      <div className="fixed top-0 left-0 w-full h-96 bg-slate-900 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-slate-900"></div>
        <div className="absolute top-20 right-[-10%] w-[50%] h-[100%] bg-blue-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white rounded-3xl shadow-xl">
                <Car className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter">臺北泊車助手</h1>
                <p className="text-[10px] font-black text-blue-300/60 uppercase tracking-[0.4em] mt-1">Live Parking Monitor</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl group">
             <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
             <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋停車場名稱 (例: 北車, 西門, 小巨蛋...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-[1.8rem] py-5 pl-16 pr-8 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-500" />
                <button 
                  type="submit" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3.5 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
                  disabled={searchStatus === LoadingState.SEARCHING}
                >
                  {searchStatus === LoadingState.SEARCHING ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
             </div>
          </form>
        </header>

        {errorMsg && (
          <div className="bg-rose-500 text-white rounded-[2rem] p-6 mb-12 flex items-center gap-4 shadow-2xl animate-bounce">
            <AlertCircle className="w-8 h-8 shrink-0" />
            <p className="font-black text-sm uppercase tracking-widest">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-12">
           <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-sm font-black text-white lg:text-slate-800 uppercase tracking-widest">我的監控中心 Dashboard</h2>
           </div>
           <button onClick={() => refreshAllData()} className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-[0.2em] transition-all">
             <RefreshCw className="w-3.5 h-3.5" /> 手動刷新
           </button>
        </div>

        {/* 核心 Grid 佈局: lg:grid-cols-2 實現一行兩個左右對稱 */}
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
                }).catch(() => setRefreshingId(null));
              }}
              onRemove={id => setParkingLots(prev => prev.filter(x => x.id !== id))}
              loading={refreshingId === lot.id}
            />
          ))}

          {/* 新增區塊引導 */}
          <button 
            onClick={() => document.querySelector('input')?.focus()}
            className="group relative border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center py-24 text-slate-300 hover:border-blue-400 hover:bg-white transition-all"
          >
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-50 transition-all">
              <Plus className="w-10 h-10 group-hover:text-blue-500" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.3em] group-hover:text-slate-600">搜尋更多地點</span>
          </button>
        </div>
      </div>
      
      <footer className="mt-40 text-center px-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em]">Taipei Smart City Open Data Integration</p>
        <p className="text-[9px] font-bold text-slate-300 mt-2">© 2025 Taipei ParkRight Live Hub</p>
      </footer>
    </div>
  );
}

export default App;
