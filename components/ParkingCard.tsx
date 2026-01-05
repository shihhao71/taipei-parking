
import React from 'react';
import { ParkingLot } from '../types';
import { RefreshCcw, MapPin, Navigation, Trash2, Banknote, Info } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const isFull = lot.availableSpaces <= 0;
  const isLow = lot.availableSpaces < 15 && !isFull;
  
  // 根據狀態決定主題顏色
  const themeColor = isFull ? 'red' : isLow ? 'orange' : 'blue';
  const themeClasses = {
    blue: 'border-blue-100 from-blue-50/50 to-white text-blue-600 shadow-blue-100',
    orange: 'border-orange-100 from-orange-50/50 to-white text-orange-600 shadow-orange-100',
    red: 'border-red-100 from-red-50/50 to-white text-red-600 shadow-red-100'
  }[themeColor];

  const statusBg = {
    blue: 'bg-blue-600 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-600 text-white'
  }[themeColor];

  return (
    <div className={`group flex flex-col bg-gradient-to-br ${themeClasses} rounded-[2rem] border-2 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl`}>
      <div className="p-8 flex-grow">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBg}`}>
                {isFull ? 'FULL' : isLow ? 'LIMITED' : 'AVAILABLE'}
              </span>
              {lot.isPinned && (
                <span className="bg-slate-800 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest">PRESET</span>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-800 truncate leading-tight group-hover:text-blue-700 transition-colors">
              {lot.name}
            </h3>
            <p className="text-sm text-slate-500 flex items-center mt-2 font-medium">
              <MapPin className="w-4 h-4 mr-1.5 text-slate-400" />
              {lot.address}
            </p>
          </div>
        </div>

        {/* Big Counter Section */}
        <div className="relative overflow-hidden bg-white/60 backdrop-blur-sm border border-white p-6 rounded-[1.5rem] mb-6 shadow-inner">
          <div className="flex items-end justify-between relative z-10">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">即時空位數</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-7xl font-black tracking-tighter ${
                  isFull ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-blue-600'
                }`}>
                  {lot.availableSpaces}
                </span>
                <span className="text-slate-300 font-bold text-2xl italic">/ {lot.totalSpaces}</span>
              </div>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-white shadow-lg border-4 ${
              isFull ? 'border-red-100' : isLow ? 'border-orange-100' : 'border-blue-100'
            }`}>
               <div className={`w-4 h-4 rounded-full animate-pulse ${
                 isFull ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'
               }`}></div>
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-slate-800 rounded-[1.2rem] p-5 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Banknote className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">費率與規則</span>
          </div>
          <p className="text-sm font-bold leading-relaxed line-clamp-2">
            {lot.rates}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-8 pb-8 flex gap-3">
        <a 
          href={lot.mapUrl} target="_blank" rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-100 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all shadow-sm"
        >
          <Navigation className="w-5 h-5" /> 導航
        </a>
        <button 
          onClick={() => onRefresh(lot.id)}
          disabled={loading}
          className={`px-5 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm ${loading ? 'animate-spin text-blue-600 border-blue-200' : ''}`}
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
        {!lot.isPinned && (
          <button 
            onClick={() => onRemove(lot.id)}
            className="px-5 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="px-8 py-3 bg-white/30 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between rounded-b-[2rem]">
        <span>ID: {lot.id}</span>
        <span>最後更新: {lot.lastUpdated.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default ParkingCard;
