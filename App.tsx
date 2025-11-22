import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, Info, MapPin } from 'lucide-react';
import { ParkingLot, LoadingState, SearchResult } from './types';
import * as GeminiService from './services/geminiService';
import ParkingCard from './components/ParkingCard';

// Helper to generate mock history data
const generateMockHistory = (capacity: number) => {
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  return hours.map(time => ({
    time,
    occupied: Math.floor(Math.random() * (capacity * 0.9))
  }));
};

function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial data (simulated storage)
  useEffect(() => {
    // Optional: Load from localStorage
  }, []);

  const handleAddParking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus(LoadingState.SEARCHING);
    setErrorMsg(null);

    try {
      // 1. Use Gemini to identify the parking lot from the user query
      const result: SearchResult = await GeminiService.searchParkingLot(searchQuery);
      
      // 2. Fetch (simulate) initial live data
      const liveData = await GeminiService.fetchLiveStatus(result.capacity);

      const newLot: ParkingLot = {
        id: Date.now().toString(),
        name: result.name,
        address: result.address,
        rates: result.rates, // Added rates
        mapUrl: result.mapUrl,
        totalSpaces: result.capacity,
        availableSpaces: liveData.available,
        isFull: liveData.isFull,
        lastUpdated: new Date(),
        occupancyHistory: generateMockHistory(result.capacity)
      };

      setParkingLots(prev => [newLot, ...prev]);
      setSearchQuery('');
      setSearchStatus(LoadingState.SUCCESS);
    } catch (error) {
      console.error(error);
      setSearchStatus(LoadingState.ERROR);
      setErrorMsg("Could not find a parking lot with that address/name. Please try again.");
    } finally {
      // Reset status after a delay so the user sees the result
      setTimeout(() => setSearchStatus(LoadingState.IDLE), 3000);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    const lot = parkingLots.find(p => p.id === id);
    if (lot) {
      try {
        const liveData = await GeminiService.fetchLiveStatus(lot.totalSpaces);
        setParkingLots(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              availableSpaces: liveData.available,
              isFull: liveData.isFull,
              lastUpdated: new Date(),
              // Simple shift of history for visual effect
              occupancyHistory: [...p.occupancyHistory.slice(1), { 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                occupied: lot.totalSpaces - liveData.available 
              }]
            };
          }
          return p;
        }));
      } catch (error) {
        console.error("Failed to refresh", error);
      }
    }
    setRefreshingId(null);
  };

  const handleRemove = (id: string) => {
    setParkingLots(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              Taipei ParkRight
            </h1>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-500 flex items-center bg-gray-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              System Operational
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Search / Add Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Find Parking in Seconds</h2>
            <p className="mt-2 text-gray-500">Enter an address, landmark, or district in Taipei to track availability.</p>
          </div>

          <form onSubmit={handleAddParking} className="relative group z-10">
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 ${searchStatus === LoadingState.SEARCHING ? 'opacity-60' : ''}`}></div>
            <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2 border border-gray-100">
              <MapPin className="w-6 h-6 text-gray-400 ml-3" />
              <input 
                type="text" 
                placeholder="e.g., 'Taipei 101', 'Daan Park Underground', 'Songshan Station'" 
                className="flex-grow p-4 text-gray-700 focus:outline-none bg-transparent font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchStatus === LoadingState.SEARCHING}
              />
              <button 
                type="button"
                disabled={searchStatus === LoadingState.SEARCHING || !searchQuery}
                onClick={handleAddParking}
                className={`
                  px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 flex items-center shadow-md
                  ${searchStatus === LoadingState.SEARCHING 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'}
                `}
              >
                {searchStatus === LoadingState.SEARCHING ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-1" />
                    Track
                  </>
                )}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-center animate-fade-in-down">
              <Info className="w-4 h-4 mr-2 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        {parkingLots.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No parking lots tracked yet</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">Start by adding a location above. We'll use AI to find the details for you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map(lot => (
              <ParkingCard 
                key={lot.id} 
                lot={lot} 
                onRefresh={handleRefresh}
                onRemove={handleRemove}
                loading={refreshingId === lot.id}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Taipei ParkRight Demo. 
            <br/>
            <span className="text-xs mt-2 block">
              Note: Real-time data is simulated for this demonstration as direct API access requires specific government keys. 
              Location data is retrieved via Google Search Grounding.
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;