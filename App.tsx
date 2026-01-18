
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Car, AlertCircle, LayoutDashboard, Plus, Loader2, RefreshCw, Activity, Layers } from 'lucide-react';
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
      setErrorMsg("北市府資料同步暫時離線，系統正在自動重新連接...");
      setSearchStatus(LoadingState.ERROR);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      refreshAllData(true);
      initialized.current = true;
    }
    const interval = setInterval(() => refreshAllData(false), 30000); 
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
        throw new Error("此停車場已在監控列表中");
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
    <div className="min-h-screen bg-mesh font-sans pb-40">
      {/* 全螢幕背景裝飾 */}
      <div className="fixed top-0 left-0 w-full h-80 bg-slate-950 z-0 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-950"></div>
        <div className="absolute -bottom-1/2 -left-1/4 w-[100%] h-[150%] bg-blue-600/10 rounded-full blur-[180px]"></div>
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-24">
          <div className="flex items-center gap-8">
            <div className="p-6 bg-white/10 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl ring-1 ring-white/20">
              <Car className="w-14 h-14 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] rounded-md border border-blue-500/30 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Real-time
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Version 2.0</span>
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter">
                Taipei <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">ParkRight</span>
              </h1>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl group">
             <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-[2.2rem] blur opacity-20 group-hover:opacity-50 transition duration-700"></div>
             <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋停車場、街道或捷運站..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 shadow-3xl"
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-700 group-hover:text-blue-500 transition-colors" />
                <button 
                  type="submit" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 active:scale-95"
                  disabled={searchStatus === LoadingState.SEARCHING}
                >
                  {searchStatus === LoadingState.SEARCHING ? <Loader2 className="w-7 h-7 animate-spin" /> : <Plus className="w-7 h-7" />}
                </button>
             </div>
          </form>
        </header>

        {errorMsg && (
          <div className="bg-rose-500/90 backdrop-blur-xl text-white rounded-[2.5rem] p-7 mb-16 flex items-center gap-5 shadow-2xl border border-rose-400/30 animate-in slide-in-from-top-10">
            <div className="bg-white/20 p-3 rounded-2xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black uppercase tracking-widest text-xs mb-1">系統通知</h4>
              <p className="font-bold text-sm opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-16 border-b border-slate-200/50 pb-8 px-2">
           <div className="flex items-center gap-5">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                <Layers className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">我的監控樞紐</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">目前共有 {parkingLots.length} 個位點載入中</p>
              </div>
           </div>
           <button 
             onClick={() => refreshAllData()} 
             className="flex items-center gap-2.5 px-6 py-3.5 bg-white text-[10px] font-black text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl border border-slate-100 shadow-sm uppercase tracking-[0.2em] transition-all active:scale-95"
           >
             <RefreshCw className="w-4 h-4" /> 同步全站資料
           </button>
        </div>

        {/* 核心 Grid 佈局: lg:grid-cols-2 實現一行兩個左右平衡 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
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

          {/* 新增引導佔位 */}
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => document.querySelector('input')?.focus(), 500);
            }}
            className="group relative border-4 border-dashed border-slate-200/60 rounded-[3rem] flex flex-col items-center justify-center py-24 text-slate-300 hover:border-blue-400/50 hover:bg-white/50 transition-all min-h-[500px]"
          >
            <div className="w-28 h-28 rounded-[2.5rem] bg-slate-100/50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-50 group-hover:rotate-12 transition-all duration-700">
              <Plus className="w-14 h-14 group-hover:text-blue-500" />
            </div>
            <span className="font-black text-lg uppercase tracking-[0.4em] group-hover:text-slate-600 transition-colors">擴展監控清單</span>
            <p className="mt-4 text-xs font-bold text-slate-400 opacity-60 px-10 text-center leading-relaxed">
              點擊這裡，然後在上方搜尋框輸入新的地點<br/>系統會自動抓取台北市政府的最新資訊
            </p>
          </button>
        </div>
      </div>
      
      <footer className="mt-60 border-t border-slate-200 bg-white/40 backdrop-blur-md pt-24 pb-32 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="max-w-4xl mx-auto px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Live</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">數據同步技術</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-200 px-10">
              <span className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Taipei</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">市府開放資料源</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">100%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">無廣告・純淨版</span>
            </div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.8em]">Designed for Modern Transportation Insights</p>
          <p className="text-[10px] font-bold text-slate-300 mt-6 tracking-widest opacity-60">© 2025 ALL RIGHTS RESERVED BY PARKRIGHT HUB</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
