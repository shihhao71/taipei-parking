
import React from 'react';
import { ParkingLot } from '../types';
import { RefreshCcw, MapPin, Navigation, Trash2, Banknote, Clock, Car } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const isFull = lot.availableSpaces <= 0;
  const isLow = lot.availableSpaces < 15 && !isFull;
  
  // 計算佔用百分比
  const occupancyPercent = lot.totalSpaces > 0 
    ? Math.round(((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100) 
    : 0;
  
  // 圓環進度條計算 (r=45, circumference = 2 * PI * 45 ≈ 283)
  const circumference = 283;
  const offset = circumference - (occupancyPercent / 100) * circumference;

  // 根據狀態決定主色調
  const colorClass = isFull ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-emerald-500';
  const strokeClass = isFull ? 'stroke-rose-500' : isLow ? 'stroke-amber-500' : 'stroke-emerald-500';
  const bgClass = isFull ? 'bg-rose-50' : isLow ? 'bg-amber-50' : 'bg-emerald-50';

  return (
    <div className={`group relative glass-card border-2 border-white rounded-[2.5rem] shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-3xl flex flex-col overflow-hidden`}>
      {/* 頂部狀態標籤 */}
      <div className="absolute top-6 right-6 flex gap-2 z-20">
        <button 
          onClick={() => onRefresh(lot.id)}
          className={`p-3 rounded-2xl bg-white/80 shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
        {!lot.isPinned && (
          <button 
            onClick={() => onRemove(lot.id)}
            className="p-3 rounded-2xl bg-white/80 shadow-sm border border-slate-100 hover:bg-rose-600 hover:text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-8 pb-4">
        {/* 名稱與地址 */}
        <div className="mb-6 max-w-[80%]">
          <div className="flex items-center gap-2 mb-3">
             <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-white shadow-lg ${isFull ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}>
               {isFull ? '已停滿' : isLow ? '車位緊張' : '尚有空位'}
             </span>
             {lot.isPinned && (
               <span className="px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-slate-800 text-white">我的最愛</span>
             )}
          </div>
          <h3 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
            {lot.name}
          </h3>
          <p className="flex items-center text-sm font-medium text-slate-400 mt-2">
            <MapPin className="w-4 h-4 mr-1.5" />
            {lot.address}
          </p>
        </div>

        {/* 核心資訊區域：左右對稱佈局 */}
        <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/50 rounded-[2rem] p-6 border border-white/50 mb-6">
          
          {/* 左側：儀表板 (圓圈) */}
          <div className="relative flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="45" stroke="white" strokeWidth="12" fill="transparent" className="shadow-inner" />
              <circle 
                cx="64" cy="64" r="45" 
                stroke="currentColor" strokeWidth="12" fill="transparent" 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${strokeClass}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${colorClass}`}>{occupancyPercent}%</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">已滿載</span>
            </div>
          </div>

          {/* 右側：數字詳情 */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">剩餘空車位</p>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className={`text-6xl font-black tracking-tighter ${colorClass}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-xl font-bold text-slate-300 italic">/ {lot.totalSpaces}</span>
            </div>
            <div className="mt-2 flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-slate-400">
              <Car className="w-3 h-3" />
              <span>車位總數</span>
            </div>
          </div>
        </div>

        {/* 費率公告 */}
        <div className="bg-white/50 backdrop-blur-sm border border-white rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Banknote className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">費率公告</span>
          </div>
          <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
            「{lot.rates}」
          </p>
        </div>
      </div>

      {/* 底部導航按鈕 */}
      <div className="px-8 pb-8">
        <a 
          href={lot.mapUrl} target="_blank" rel="noreferrer"
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4.5 rounded-2xl text-sm font-black hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-200"
        >
          <Navigation className="w-5 h-5" /> 立即開啟導航
        </a>
      </div>

      {/* 頁腳小字 */}
      <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 最後更新 {lot.lastUpdated.toLocaleTimeString()}</span>
        <span>ID: {lot.id}</span>
      </div>
    </div>
  );
};

export default ParkingCard;
