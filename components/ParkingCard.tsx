
import React from 'react';
import { ParkingLot } from '../types';
import { RefreshCcw, MapPin, Navigation, Trash2, Banknote, Clock, ExternalLink } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const isFull = lot.availableSpaces <= 0;
  const isLow = lot.availableSpaces < 15 && !isFull;
  const occupancyRate = lot.totalSpaces > 0 ? (lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces : 0;
  
  // 視覺佈置變數
  const statusColor = isFull ? 'rose' : isLow ? 'amber' : 'indigo';
  
  const cardStyles = {
    rose: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    amber: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    indigo: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white"
  }[statusColor];

  const badgeStyles = {
    rose: "bg-rose-500 text-white",
    amber: "bg-amber-500 text-white",
    indigo: "bg-indigo-600 text-white"
  }[statusColor];

  const numberStyles = {
    rose: "text-rose-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600"
  }[statusColor];

  return (
    <div className={`relative flex flex-col ${cardStyles} rounded-[2.5rem] border-2 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl overflow-hidden`}>
      {/* 裝飾性背景元素 */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white opacity-40 blur-3xl pointer-events-none"></div>
      
      <div className="p-8 md:p-10 flex-grow relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] shadow-sm ${badgeStyles}`}>
                {isFull ? '已滿車' : isLow ? '位子緊張' : '尚有車位'}
              </span>
              {lot.isPinned && (
                <span className="bg-slate-800 text-slate-100 text-[11px] font-black px-4 py-1.5 rounded-full tracking-[0.15em] shadow-sm">
                  我的最愛
                </span>
              )}
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-2">
              {lot.name}
            </h3>
            <div className="flex items-center text-slate-400 font-semibold text-sm">
              <MapPin className="w-4 h-4 mr-1.5 text-slate-300" />
              {lot.address}
            </div>
          </div>
        </div>

        {/* Status Counter Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
          <div className="flex-shrink-0 relative">
            {/* 圓環背景 */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
              <circle 
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={364.4}
                strokeDashoffset={364.4 * (1 - occupancyRate)}
                className={`transition-all duration-1000 ${numberStyles}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${numberStyles}`}>{Math.round(occupancyRate * 100)}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">佔用率</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="mb-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">剩餘空位 / 總位數</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className={`text-7xl font-black tracking-tighter ${numberStyles}`}>
                {lot.availableSpaces}
              </span>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-300">/ {lot.totalSpaces}</span>
                <div className={`h-1.5 w-12 rounded-full mt-1 ${isFull ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                  <div className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white/70 backdrop-blur-md border border-white p-6 rounded-[1.8rem] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Banknote className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">費率公告</span>
          </div>
          <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
            「{lot.rates}」
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-8 pb-10 flex gap-4 relative z-10">
        <a 
          href={lot.mapUrl} target="_blank" rel="noreferrer"
          className="flex-[2] flex items-center justify-center gap-3 bg-slate-900 text-white py-4.5 rounded-2xl text-sm font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
        >
          <Navigation className="w-5 h-5" /> 立即導航
        </a>
        <button 
          onClick={() => onRefresh(lot.id)}
          disabled={loading}
          className={`flex-1 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all ${loading ? 'opacity-50' : 'hover:shadow-md'}`}
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {!lot.isPinned && (
          <button 
            onClick={() => onRemove(lot.id)}
            className="flex-1 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all hover:shadow-md"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="px-10 py-4 bg-slate-50/50 flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {lot.lastUpdated.toLocaleTimeString()}</span>
          <span className="opacity-40">|</span>
          <span>ID: {lot.id}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-400/50">
          <ExternalLink className="w-3 h-3" />
          LIVE SYNC
        </div>
      </div>
    </div>
  );
};

export default ParkingCard;
