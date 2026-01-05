
import React from 'react';
import { ParkingLot } from '../types';
import { RefreshCcw, MapPin, Navigation, Trash2, Clock, Banknote } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const isFull = lot.availableSpaces <= 0;
  const isLow = lot.availableSpaces < 10 && !isFull;
  
  return (
    <div className={`flex flex-col bg-white rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl ${
      isFull ? 'border-red-200 bg-red-50/5' : lot.isPinned ? 'border-blue-500 shadow-lg shadow-blue-50' : 'border-slate-100'
    }`}>
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-slate-800 truncate mb-1">{lot.name}</h3>
            <p className="text-xs text-slate-400 flex items-center truncate">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              {lot.address}
            </p>
          </div>
          {lot.isPinned && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md ml-2 shrink-0">PIN</span>
          )}
        </div>

        <div className={`flex items-center justify-between p-5 rounded-2xl mb-6 ${isFull ? 'bg-red-100' : 'bg-slate-50'}`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">即時空位</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-black tracking-tighter ${isFull ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-blue-600'}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-slate-300 font-bold text-lg">/ {lot.totalSpaces}</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${isFull ? 'bg-red-500 text-white' : 'bg-white text-slate-500'}`}>
            {isFull ? 'FULL' : 'OPEN'}
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">費率資訊</span>
          </div>
          <p className="text-xs text-slate-700 font-bold leading-relaxed">
            {lot.rates}
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 rounded-b-3xl">
        <a 
          href={lot.mapUrl} target="_blank" rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all"
        >
          <Navigation className="w-4 h-4" /> 導航
        </a>
        <button 
          onClick={() => onRefresh(lot.id)}
          disabled={loading}
          className={`px-4 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all ${loading ? 'animate-spin text-blue-600' : ''}`}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
        {!lot.isPinned && (
          <button 
            onClick={() => onRemove(lot.id)}
            className="px-4 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="px-6 py-2 flex items-center justify-end text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
        Updated: {lot.lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ParkingCard;
