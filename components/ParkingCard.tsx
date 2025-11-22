import React from 'react';
import { ParkingLot } from '../types';
import AvailabilityChart from './AvailabilityChart';
import { RefreshCcw, MapPin, Navigation, CircleDollarSign } from 'lucide-react';

interface ParkingCardProps {
  lot: ParkingLot;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}

const ParkingCard: React.FC<ParkingCardProps> = ({ lot, onRefresh, onRemove, loading }) => {
  const occupancyRate = ((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100;
  
  let statusColor = 'bg-green-500';
  let statusText = 'Available';
  
  if (lot.availableSpaces === 0) {
    statusColor = 'bg-red-500';
    statusText = 'Full';
  } else if (lot.availableSpaces < lot.totalSpaces * 0.15) {
    statusColor = 'bg-yellow-500';
    statusText = 'Busy';
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-2">
            <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-1" title={lot.name}>{lot.name}</h3>
            <div className="flex items-center text-gray-500 mt-1.5">
              <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-blue-500" />
              <p className="text-xs line-clamp-1 text-gray-600">{lot.address}</p>
            </div>
            <div className="flex items-center text-gray-500 mt-1.5">
              <CircleDollarSign className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-green-600" />
              <p className="text-xs line-clamp-1 text-gray-600 font-medium">{lot.rates}</p>
            </div>
          </div>
          <div className={`${statusColor} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0`}>
            {statusText}
          </div>
        </div>

        <div className="flex items-end justify-between mt-6">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Available Spaces</p>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${lot.availableSpaces < 10 ? 'text-red-600' : 'text-gray-800'}`}>
                {lot.availableSpaces}
              </span>
              <span className="text-gray-400 text-sm ml-1 font-medium">/ {lot.totalSpaces}</span>
            </div>
          </div>
          
          {/* Mini Circular Progress or Visual Indicator */}
          <div className="w-16 h-16 relative flex items-center justify-center">
             <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={175.92} 
                  strokeDashoffset={175.92 - (175.92 * occupancyRate) / 100} 
                  className={`${lot.availableSpaces < 10 ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} 
                />
             </svg>
             <span className="absolute text-[10px] font-bold text-gray-600">{Math.round(occupancyRate)}%</span>
          </div>
        </div>

        <AvailabilityChart data={lot.occupancyHistory} capacity={lot.totalSpaces} />
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          Updated: {lot.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
        <div className="flex gap-2">
           {lot.mapUrl && (
            <a 
              href={lot.mapUrl} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="View on Google Maps"
            >
              <Navigation className="w-4 h-4" />
            </a>
          )}
          <button 
            onClick={() => onRefresh(lot.id)} 
            disabled={loading}
            className={`p-2 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors ${loading ? 'animate-spin text-blue-400' : ''}`}
            title="Refresh Data"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onRemove(lot.id)}
            className="p-2 rounded-full bg-white text-red-400 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors"
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