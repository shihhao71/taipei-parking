import React from 'react';
import { ParkingLot } from '../types';
import AvailabilityChart from './AvailabilityChart';
import { RefreshCcw, MapPin, Navigation, CircleDollarSign, Clock } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const occupancyRate = lot.totalSpaces > 0 
    ? ((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100 
    : 0;
  
  let statusColor = 'bg-green-500';
  let statusText = 'Available';
  
  if (lot.availableSpaces === 0) {
    statusColor = 'bg-red-500';
    statusText = 'Full';
  } else if (lot.availableSpaces < 10 || occupancyRate > 90) {
    statusColor = 'bg-red-500';
    statusText = 'Very Low';
  } else if (occupancyRate > 70) {
    statusColor = 'bg-yellow-500';
    statusText = 'Busy';
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-2">
            <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-1" title={lot.name}>{lot.name}</h3>
            <div className="flex items-center text-gray-500 mt-1.5">
              <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-blue-500" />
              <p className="text-xs line-clamp-1 text-gray-600" title={lot.address}>{lot.address}</p>
            </div>
            <div className="flex items-center text-gray-500 mt-1.5">
              <CircleDollarSign className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-green-600" />
              <p className="text-xs line-clamp-1 text-gray-600 font-medium" title={lot.rates}>
                {lot.rates.length > 30 ? lot.rates.substring(0, 30) + '...' : lot.rates}
              </p>
            </div>
          </div>
          <div className={`${statusColor} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 shadow-sm`}>
            {statusText}
          </div>
        </div>

        <div className="flex items-end justify-between mt-6">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Available Spaces</p>
            <div className="flex items-baseline">
              <span className={`text-5xl font-bold tracking-tighter ${lot.availableSpaces < 10 ? 'text-red-600' : 'text-gray-800'}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-gray-400 text-sm ml-1 font-medium">/ {lot.totalSpaces}</span>
            </div>
          </div>
          
          {/* Circular Progress */}
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
                  className={`${lot.availableSpaces < 10 ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} 
                />
             </svg>
             <span className="absolute text-[10px] font-bold text-gray-600">{Math.round(occupancyRate)}%</span>
          </div>
        </div>

        {/* Chart is purely visual estimation for now as API history is not available */}
        <AvailabilityChart data={lot.occupancyHistory} capacity={lot.totalSpaces} />
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center text-xs text-gray-400">
          <Clock className="w-3 h-3 mr-1" />
          {lot.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        <div className="flex gap-2">
           {lot.mapUrl && (
            <a 
              href={lot.mapUrl} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
              title="View on Google Maps"
            >
              <Navigation className="w-4 h-4" />
            </a>
          )}
          <button 
            onClick={() => onRefresh(lot.id)} 
            disabled={loading}
            className={`p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm ${loading ? 'animate-spin text-blue-400' : ''}`}
            title="Refresh Live Data"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onRemove(lot.id)}
            className="p-2 rounded-full bg-white text-red-400 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
            title="Remove"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingCard;