import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Search, 
  Menu, 
  Mic, 
  Layers, 
  Navigation2, 
  Share2, 
  Bookmark, 
  ChevronDown, 
  Crosshair, 
  Star,
  Clock,
  Car,
  MoreVertical,
  X,
  Coffee,
  Fuel,
  Hotel,
  UtensilsCrossed,
  Info,
  Layers as LayersIcon,
  Plus,
  Minus,
  Zap,
  Activity
} from 'lucide-react';
import axios from 'axios';

const SolapurUltimateGoogleMap = ({ zones }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const getMapUrl = () => {
    const base = "https://maps.google.com/maps";
    const q = searchQuery ? `${searchQuery} Solapur` : "Solapur Maharashtra India";
    return `${base}?q=${encodeURIComponent(q)}&t=m&z=14&output=embed&iwloc=near`;
  };

  const handleDirections = () => {
    const destination = searchQuery || "Solapur";
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination + " Solapur")}`;
    window.open(url, '_blank');
  };

  const categories = [
    { icon: UtensilsCrossed, label: 'Restaurants' },
    { icon: Fuel, label: 'Petrol' },
    { icon: Fuel, label: 'CNG Station', isNew: true },
    { icon: Hotel, label: 'Hotels' },
    { icon: Coffee, label: 'Cafe' },
    { icon: MapPin, label: 'Atm' },
    { icon: Activity, label: 'Garage/Repair', isNew: true }
  ];

  return (
    <div className="relative w-full h-[75vh] md:h-[800px] bg-white rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl border-[1px] md:border-[2px] border-white group select-none transition-all duration-1000">
      
      {/* ⚡ SMART MOBILITY FLOATING PANEL - NEW FEATURE */}
      <div className="absolute top-24 md:top-32 left-4 md:left-10 z-[50] flex flex-col gap-2 md:gap-3 pointer-events-none group-hover:scale-105 transition-transform duration-500">
         <div className="flex flex-col bg-white/90 backdrop-blur-xl p-3 md:p-5 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white pointer-events-auto">
            <h5 className="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 md:mb-5 px-1 flex items-center gap-2">
               <Zap className="w-3 h-3 animate-pulse text-emerald-500" />
               Smart Services
            </h5>
            <div className="flex flex-col gap-3 md:gap-5">
               <button onClick={() => setSearchQuery('Petrol Pump')} className="group/btn flex items-center gap-4 text-gray-500 hover:text-blue-600 transition-all">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all">
                     <Fuel className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <span className="hidden md:block text-xs font-black uppercase tracking-tighter">Petrol Stations</span>
               </button>
               <button onClick={() => setSearchQuery('CNG Pump')} className="group/btn flex items-center gap-4 text-gray-500 hover:text-emerald-600 transition-all">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-all">
                     <Fuel className="w-5 h-5 md:w-6 md:h-6 rotate-12" />
                  </div>
                  <span className="hidden md:block text-xs font-black uppercase tracking-tighter">CNG Stations</span>
               </button>
               <button onClick={() => setSearchQuery('Car Bike Repair Garage')} className="group/btn flex items-center gap-4 text-gray-500 hover:text-orange-600 transition-all">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-2xl flex items-center justify-center group-hover/btn:bg-orange-600 group-hover/btn:text-white transition-all">
                     <Car className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <span className="hidden md:block text-xs font-black uppercase tracking-tighter">Nearby Garages</span>
               </button>
            </div>
         </div>
      </div>
      {/* 🚀 GOOGLE MAPS FLOATING UI (HUD) - MOBILE OPTIMIZED */}
      <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 w-[94%] md:w-[580px] z-[50] flex flex-col gap-3 md:gap-4 pointer-events-none">
         {/* Search Bar - Realistic Chrome Style */}
         <div className="w-full bg-white rounded-2xl md:rounded-full shadow-2xl flex items-center px-4 md:px-6 h-12 md:h-16 border border-gray-100 pointer-events-auto transition-all">
            <Menu className="w-5 h-5 text-gray-400 mr-2 md:mr-4 cursor-pointer hidden md:block" />
            <input 
                type="text" 
                placeholder="Search Solapur Smart City..." 
                value={searchQuery}
                onFocus={(e) => e.target.placeholder = ""}
                onBlur={(e) => e.target.placeholder = "Search Solapur Smart City..."}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none flex-1 text-sm md:text-base font-bold text-gray-700" 
            />
            <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-4 border-l border-gray-100 ml-1 md:ml-2">
               <Mic className="w-5 h-5 text-blue-500 cursor-pointer" />
               <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-600 rounded-xl md:rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 active:scale-90 transition-transform cursor-pointer">
                  <Search className="w-5 h-5" />
               </div>
            </div>
         </div>

         {/* Category Chips Scrollable - Better Mobile Spacing */}
         <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto px-1 pb-2">
            {categories.map(cat => (
               <button 
                key={cat.label} 
                onClick={() => setSearchQuery(cat.label)}
                className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full shadow-xl border border-gray-50 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95 ${
                    searchQuery === cat.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
               >
                  <cat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${searchQuery === cat.label ? 'text-white' : 'text-blue-600'}`} />
                  {cat.label}
               </button>
            ))}
         </div>
      </div>

      {/* 🧭 NAVIGATION TIER CONTROLS - MOBILE RE-POSITIONED */}
      <div className="absolute bottom-32 md:top-48 right-4 md:right-6 flex flex-col gap-2 md:gap-3 z-[40]">
         <div className="flex flex-col bg-white/90 backdrop-blur-md rounded-2xl md:rounded-[1.8rem] shadow-2xl border border-white overflow-hidden">
            <button className="p-3 md:p-4 text-gray-600 hover:bg-blue-50 border-b border-gray-100 transition-all"><Plus className="w-5 h-5" /></button>
            <button className="p-3 md:p-4 text-gray-600 hover:bg-blue-50 transition-all"><Minus className="w-5 h-5" /></button>
         </div>
         <button className="p-3 md:p-4 bg-white/90 backdrop-blur-md rounded-2xl md:rounded-[1.8rem] shadow-2xl text-gray-700 hover:text-blue-600 transition-all active:scale-90 flex items-center justify-center">
            <LayersIcon className="w-6 h-6" />
         </button>
         <button className="p-3 md:p-4 bg-white/90 backdrop-blur-md rounded-2xl md:rounded-[1.8rem] shadow-2xl text-blue-600 hover:bg-blue-50 transition-all active:scale-90 flex items-center justify-center">
            <Crosshair className="w-6 h-6" />
         </button>
      </div>

      {/* 🗺️ THE NATIVE GOOGLE MAPS IFRAME ENGINE */}
      <div className="w-full h-full relative z-0">
         <iframe
            src={getMapUrl()}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            title="Solapur Native Google Map"
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
         ></iframe>
         
         {/* Live Sync Status Overlay - Hide on mobile if too small */}
         <div className="hidden md:flex absolute bottom-8 left-8 z-[30] items-center gap-4 bg-white/95 backdrop-blur-xl px-7 py-5 rounded-[2.5rem] shadow-2xl border border-white">
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping"></div>
            <div className="flex flex-col">
               <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Live Feed Active</p>
               <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none">Solapur Municipal Grid Sync</h4>
            </div>
         </div>
      </div>

      {/* 📋 THE ADAPTIVE BOTTOM SHEET - TOUCH OPTIMIZED FOR MOBILE */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white shadow-[0_-20px_80px_rgba(0,0,0,0.15)] transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-[60] rounded-t-[2.5rem] md:rounded-t-[4rem] flex flex-col ${
            searchQuery ? 'h-[320px] md:h-[280px]' : 'h-16 md:h-24'
        }`}
      >
        <div onClick={() => searchQuery && setSearchQuery('')} className="w-[18%] md:w-[15%] h-1.5 md:h-2 bg-gray-200 rounded-full mx-auto mt-6 mb-2 cursor-pointer hover:bg-blue-100 transition-colors shrink-0"></div>
        
        {!searchQuery ? (
           <div className="flex items-center justify-between px-8 md:px-14 py-2">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_#2563eb]"></div>
                 <span className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.3em] md:tracking-[0.5em]">Native Google Engine [Active]</span>
              </div>
              <ChevronDown className="w-6 h-6 md:w-8 md:h-8 text-blue-500 animate-bounce" />
           </div>
        ) : (
           <div className="flex-1 overflow-y-auto px-8 md:px-14 pb-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
              <div className="flex-1 w-full">
                 <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm md:text-lg font-black text-slate-900 tracking-tighter">Verified Landmark</span>
                 </div>
                 <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter mb-4 capitalize truncate max-w-xs md:max-w-none">
                    {searchQuery} <span className="text-blue-600">Solapur</span>
                 </h2>
                 <div className="flex gap-3 md:gap-4 w-full md:w-auto">
                    <button 
                        onClick={handleDirections}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-10 py-4 md:py-5 bg-[#1A73E8] text-white rounded-2xl md:rounded-[1.8rem] font-black text-xs md:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                       <Navigation className="w-5 h-5 rotate-45" /> Get Directions
                    </button>
                    <button onClick={() => setSearchQuery('')} className="p-4 md:p-5 bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl md:rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              
              {/* Desktop Only Preview Context Image */}
              <div className="hidden md:block w-48 h-32 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100/50 flex items-center justify-center shrink-0">
                 <Navigation2 className="w-10 h-10 text-indigo-200" />
              </div>
           </div>
        )}
      </div>

    </div>
  );
};

export default function TrafficMap() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try { const { data } = await axios.get('/api/traffic/zones'); setZones(data); } catch (e) {}
    };
    fetchData(); 
  }, []);

  return (
    <div className="p-4 md:p-14 flex flex-col gap-6 md:gap-10 max-w-[1700px] mx-auto pb-40 md:pb-80">
       <div className="px-4 md:px-10 space-y-1">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Solapur Navigator OS</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">City <span className="text-blue-600">Navigator</span></h1>
          <p className="text-sm md:text-lg font-bold text-gray-400 max-w-2xl leading-relaxed">Integrated Google Maps infrastructure for Solapur Smart City.</p>
       </div>

       <SolapurUltimateGoogleMap zones={zones} />

       <style jsx="true">{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
       `}</style>
    </div>
  );
}
