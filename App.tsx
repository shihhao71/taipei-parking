
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Car, AlertCircle, LayoutDashboard, Plus, Loader2, RefreshCw, Zap, TrendingUp } from 'lucide-react';
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
      setErrorMsg("北市府資料同步暫時中斷，正在自動重試...");
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
        throw new Error("此停車場已在您的監控清單中");
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-32">
      {/* 視覺化的背景區域 */}
      <div className="bg-slate-900 h-96 w-full absolute top-0 left-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900 to-slate-900"></div>
        {/* 背景裝飾網格 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        {/* 動態炫光 */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-20 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-20">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-20">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-white rounded-[2rem] shadow-2xl shadow-blue-900/30 ring-8 ring-white/10">
              <Car className="w-12 h-12 text-blue-600" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
                臺北泊車 <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Hub</span>
              </h1>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-blue-300 uppercase tracking-widest border border-white/5">
                  <TrendingUp className="w-3 h-3" /> Live Statistics
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">
                  臺北市政府公開資料同步中
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative">
              <input
                type="text"
                placeholder="輸入關鍵字 (例: 小巨蛋, 台北車站, 萬華...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 backdrop-blur-2xl border border-white/10 rounded-[1.8rem] py-5 pl-16 pr-8 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 shadow-2xl"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-500" />
              <button 
                type="submit" 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3.5 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30"
                disabled={searchStatus === LoadingState.SEARCHING}
              >
                {searchStatus === LoadingState.SEARCHING ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
              </button>
            </div>
          </form>
        </header>

        {errorMsg && (
          <div className="bg-rose-500 text-white rounded-3xl p-5 mb-12 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-2xl shadow-rose-200">
            <AlertCircle className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-black text-sm uppercase tracking-widest mb-0.5">系統提示</p>
              <p className="text-sm font-bold opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white lg:text-slate-800 uppercase tracking-[0.3em]">監控中心 Dashboard</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">目前追蹤：{parkingLots.length} 個停車場點位</p>
            </div>
          </div>
          <div className="h-px bg-slate-200 flex-1 hidden md:block" />
          <button 
            onClick={() => refreshAllData()} 
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 uppercase tracking-widest"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 立即刷新數據
          </button>
        </div>

        {/* 核心 Grid 佈局: lg:grid-cols-2 實現一行兩個左右對稱 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
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

          {/* 新增停車場佔位符 */}
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => document.querySelector('input')?.focus(), 500);
            }}
            className="group relative border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center py-24 text-slate-300 hover:border-blue-400 hover:bg-white transition-all min-h-[450px]"
          >
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-50 transition-all duration-700">
              <Plus className="w-12 h-12 text-slate-300 group-hover:text-blue-500" />
            </div>
            <span className="font-black text-base uppercase tracking-[0.4em] group-hover:text-slate-600">新增監控點</span>
            <p className="mt-3 text-[11px] opacity-50 font-bold italic group-hover:opacity-100 transition-opacity">利用上方搜尋框，輸入關鍵字來擴展您的清單</p>
          </button>
        </div>
      </div>
      
      <footer className="mt-32 border-t border-slate-200 pt-16 text-center">
        <div className="flex justify-center gap-12 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-800">30s</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">刷新頻率</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-800">Cloud</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">同步引擎</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-800">100%</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">官方資料源</span>
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em]">Taipei City Smart Transportation Data Platform</p>
      </footer>
    </div>
  );
}

export default App;
