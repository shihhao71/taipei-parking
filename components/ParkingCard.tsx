
import React from 'react';
import { ParkingLot } from '../types';
import { RefreshCcw, MapPin, Navigation, Trash2, Banknote, Clock, Car, Info, Copy } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const isFull = lot.availableSpaces <= 0;
  const isLow = lot.availableSpaces < 15 && !isFull;
  
  const occupancyPercent = lot.totalSpaces > 0 
    ? Math.round(((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100) 
    : 0;
  
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (occupancyPercent / 100) * circumference;

  const getStatusConfig = () => {
    if (isFull) return { color: 'rose', text: '停車位已滿', bg: 'bg-rose-500', stroke: 'stroke-rose-500', light: 'bg-rose-400' };
    if (isLow) return { color: 'amber', text: '位子快沒了', bg: 'bg-amber-500', stroke: 'stroke-amber-500', light: 'bg-amber-400' };
    return { color: 'emerald', text: '停車位充足', bg: 'bg-emerald-600', stroke: 'stroke-emerald-500', light: 'bg-emerald-400' };
  };

  const config = getStatusConfig();

  return (
    <div className={`group relative glass-effect rounded-[2.8rem] shadow-premium transition-all duration-700 hover:-translate-y-3 hover:shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6`}>
      {/* 背景裝飾光點 */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${config.bg} opacity-[0.05] blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity animate-pulse-soft`}></div>
      
      {/* 功能按鈕組 */}
      <div className="absolute top-8 right-8 flex gap-3 z-20">
        <button 
          onClick={() => onRefresh(lot.id)}
          className={`p-3.5 rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all ${loading ? 'animate-spin' : ''}`}
          title="刷新狀態"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
        {!lot.isPinned && (
          <button 
            onClick={() => onRemove(lot.id)}
            className="p-3.5 rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all"
            title="移除監控"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-10 pb-6 flex-grow">
        {/* 名稱與地址 */}
        <div className="mb-10 pr-24">
          <div className="flex flex-wrap items-center gap-2 mb-4">
             <span className={`px-5 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] uppercase text-white shadow-md ${config.bg}`}>
               {config.text}
             </span>
             {lot.isPinned && (
               <span className="px-5 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] uppercase bg-slate-800 text-white flex items-center gap-1.5">
                 <Info className="w-3 h-3" /> 我的預設
               </span>
             )}
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors mb-3">
            {lot.name}
          </h3>
          <div className="group/addr flex items-center text-slate-400 font-semibold text-sm cursor-pointer hover:text-slate-600 transition-colors"
               onClick={() => {
                 navigator.clipboard.writeText(lot.address);
                 alert('地址已複製');
               }}>
            <MapPin className="w-4.5 h-4.5 mr-2 text-blue-500/50" />
            <span className="truncate">{lot.address}</span>
            <Copy className="w-3 h-3 ml-2 opacity-0 group-hover/addr:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* 視覺數據區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/40 p-8 rounded-[2.2rem] border border-white/60 shadow-inner">
          
          {/* 左：儀表盤 */}
          <div className="relative flex justify-center">
            <svg className="w-36 h-36 transform -rotate-90">
              {/* 底環 */}
              <circle cx="72" cy="72" r="42" stroke="white" strokeWidth="14" fill="transparent" />
              {/* 進度環 */}
              <circle 
                cx="72" cy="72" r="42" 
                stroke="currentColor" strokeWidth="14" fill="transparent" 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${config.stroke} filter drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${config.stroke.replace('stroke', 'text')}`}>{occupancyPercent}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">已佔用</span>
            </div>
          </div>

          {/* 右：數值細節 */}
          <div className="text-center md:text-left flex flex-col justify-center">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${config.light} animate-pulse-soft`}></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">當前剩餘車位</span>
            </div>
            <div className="flex items-baseline justify-center md:justify-start gap-3 mb-1">
              <span className={`text-7xl font-black tracking-tighter ${config.stroke.replace('stroke', 'text')}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-2xl font-bold text-slate-300 italic">/ {lot.totalSpaces}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center md:justify-start gap-1.5 opacity-60">
              <Car className="w-3.5 h-3.5" /> 總車位容量
            </p>
          </div>
        </div>

        {/* 費率詳情區 */}
        <div className="mt-8 flex items-start gap-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100/30">
          <div className="mt-1 p-2 bg-white rounded-xl shadow-sm">
            <Banknote className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">費率與規則</p>
            <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
              {lot.rates}
            </p>
          </div>
        </div>
      </div>

      {/* 底部導航 */}
      <div className="px-10 pb-10 pt-2">
        <a 
          href={lot.mapUrl} target="_blank" rel="noreferrer"
          className="group/nav w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-[1.5rem] text-sm font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 hover:shadow-blue-200"
        >
          <Navigation className="w-5 h-5 group-hover/nav:animate-bounce" /> 
          <span>開啟導覽地圖</span>
        </a>
      </div>

      {/* 系統日誌底條 */}
      <div className="px-10 py-4 bg-slate-50 border-t border-slate-100/50 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em]">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-40" /> 更新：{lot.lastUpdated.toLocaleTimeString()}</span>
        <span className="bg-slate-200/50 px-2.5 py-0.5 rounded-md">ID: {lot.id}</span>
      </div>
    </div>
  );
};

export default ParkingCard;
