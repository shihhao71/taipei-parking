
import React, { useEffect, useState } from 'react';
import { ParkingLot } from '../types';
import AvailabilityChart from './AvailabilityChart';
import { RefreshCcw, MapPin, Navigation, CircleDollarSign, Clock, Wifi, Info, Star, Trash2 } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (loading) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const occupancyRate = lot.totalSpaces > 0 
    ? ((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100 
    : 0;
  
  let statusColor = 'bg-green-500';
  let statusText = '有位';
  
  if (lot.availableSpaces === 0) {
    statusColor = 'bg-red-500';
    statusText = '已滿';
  } else if (lot.availableSpaces < 5) {
    statusColor = 'bg-orange-500';
    statusText = '即將客滿';
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 overflow-hidden flex flex-col h-full relative ${
      lot.isPinned 
        ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100 shadow-md' 
        : 'border-gray-100'
    }`}>
      {loading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-10"></div>
      )}
      
      {lot.isPinned && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter z-10">
          Pinned
        </div>
      )}
      
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-2">
            <div className="flex items-center gap-1.5 mb-1">
              {lot.isPinned && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <h3 className="font-bold text-lg text-gray-900 leading-tight" title={lot.name}>{lot.name}</h3>
            </div>
            <div className="flex items-center text-gray-500 mt-1.5">
              <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-blue-500" />
              <p className="text-xs line-clamp-1 text-gray-600" title={lot.address}>{lot.address}</p>
            </div>
            <div className="flex items-center text-gray-500 mt-1.5">
              <CircleDollarSign className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-green-600" />
              <p className="text-xs line-clamp-1 text-gray-600 font-medium" title={lot.rates}>
                {lot.rates}
              </p>
            </div>
          </div>
          <div className={`${statusColor} text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider flex-shrink-0 shadow-sm`}>
            {statusText}
          </div>
        </div>

        <div className="flex items-end justify-between mt-6">
          <div className={`transition-transform duration-300 ${isUpdating ? 'scale-110' : 'scale-100'}`}>
            <div className="flex items-center space-x-1 mb-1">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">剩餘汽車位</p>
              <Wifi className={`w-3 h-3 ${loading ? 'text-blue-500 animate-pulse' : 'text-blue-300'}`} />
            </div>
            <div className="flex items-baseline">
              <span className={`text-5xl font-bold tracking-tighter transition-colors duration-500 ${lot.availableSpaces < 5 ? 'text-red-600' : 'text-gray-800'}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-gray-400 text-sm ml-1 font-medium">/ {lot.totalSpaces}</span>
            </div>
          </div>
          
          <div className="w-16 h-16 relative flex items-center justify-center">
             <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="currentColor" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={175.92} 
                  strokeDashoffset={175.92 - (175.92 * occupancyRate) / 100} 
                  strokeLinecap="round"
                  className={`${lot.availableSpaces < 5 ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} 
                />
             </svg>
             <span className="absolute text-[10px] font-bold text-gray-600">{Math.round(occupancyRate)}%</span>
          </div>
        </div>

        <div className={`mt-4 flex items-center p-2 rounded-lg border transition-colors ${lot.isPinned ? 'bg-blue-100/50 border-blue-200' : 'bg-blue-50 border-blue-100'}`}>
           <Info className="w-3 h-3 text-blue-400 mr-2 flex-shrink-0" />
           <p className="text-[9px] text-blue-600 leading-tight">同步來源：台北市公用停車場即時資料庫 (與 iTaipei 官網數據同步)</p>
        </div>

        <AvailabilityChart data={lot.occupancyHistory} capacity={lot.totalSpaces} />
      </div>

      <div className={`px-6 py-3 border-t flex justify-between items-center ${lot.isPinned ? 'bg-blue-100/30 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center text-[10px] text-gray-400 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          更新時間：{lot.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
        </div>
        <div className="flex gap-2">
           {lot.mapUrl && (
            <a 
              href={lot.mapUrl} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
              title="查看地圖"
            >
              <Navigation className="w-4 h-4" />
            </a>
           )}
          <button 
            onClick={() => onRefresh(lot.id)} 
            disabled={loading}
            className={`p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm ${loading ? 'animate-spin text-blue-400' : ''}`}
            title="手動刷新"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          {!lot.isPinned && (
            <button 
              onClick={() => onRemove(lot.id)}
              className="p-2 rounded-full bg-white text-red-400 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
              title="移除停車場"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingCard;
