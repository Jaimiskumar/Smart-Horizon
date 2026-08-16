import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bot } from 'lucide-react';

export default function TrafficMonitoring() {
  // Global control mode state
  const [controlMode, setControlMode] = useState('Automatic'); // 'Automatic' | 'Manual'

  // Alerts State
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'violation', title: 'Violation: Illegal U-Turn detected', location: 'Oasis Mall Area', time: 'Just now', colorHex: '#EF4444', bgClass: 'bg-red-100', textClass: 'text-[#EF4444]' },
    { id: 2, type: 'warning', title: 'Congestion Warning: Heavy backlog building', location: 'Park Shopping Complex - City Corner', time: '4 mins ago', colorHex: '#F59E0B', bgClass: 'bg-amber-100', textClass: 'text-[#F59E0B]' }
  ]);

  // States of each zone
  const [zones, setZones] = useState([
    { id: 1, name: 'Oasis Mall Area', latitude: 17.676673, longitude: 75.8986813, vehicles: 342, congestion: 'LOW', signal: 'Green', timer: 45, cam: 'CAM-STN-001', videoUrl: '/videos/Hikvision_Traffic_Flow_Analysis_Camera_240P.mp4' },
    { id: 2, name: 'Park Shopping Complex - City Corner', latitude: 17.6796, longitude: 75.9088, vehicles: 890, congestion: 'MEDIUM', signal: 'Red', timer: 15, cam: 'CAM-MKT-002', videoUrl: '/videos/Vehicle Detection and Traffic Counting using AI..mp4' },
    { id: 3, name: 'Virat Mall - Hotgi Road', latitude: 17.6710335, longitude: 75.9418596, vehicles: 756, congestion: 'MEDIUM', signal: 'Red', timer: 60, cam: 'CAM-VJP-003', videoUrl: '/videos/video_2.mp4' },
    { id: 4, name: 'City Pride - GMR Mall Area', latitude: 17.6743, longitude: 75.9138, vehicles: 1204, congestion: 'HIGH', signal: 'Green', timer: 30, cam: 'CAM-HWY-004', videoUrl: '/videos/video_3.mp4' },
    { id: 5, name: 'Soham Mall - Hospital Stretch', latitude: 17.6644158, longitude: 75.9126046, vehicles: 210, congestion: 'LOW', signal: 'Red', timer: 25, cam: 'CAM-CVL-005', videoUrl: '/videos/video_4.mp4' },
    { id: 6, name: 'Bhuikot Fort - Siddheshwar Area', latitude: 17.6744887, longitude: 75.9021219, vehicles: 950, congestion: 'HIGH', signal: 'Yellow', timer: 5, cam: 'CAM-SQR-006', videoUrl: '/videos/video_3.mp4' },
    { id: 7, name: 'Solapur Cancer Center Junction', latitude: 17.656601, longitude: 75.896723, vehicles: 640, congestion: 'MEDIUM', signal: 'Green', timer: 50, cam: 'CAM-ITP-007', videoUrl: '/videos/video_2.mp4' },
    { id: 8, name: 'Bharat Mata Nagar - Gangji Mill', latitude: 17.6284768, longitude: 75.9298602, vehicles: 112, congestion: 'LOW', signal: 'Green', timer: 10, cam: 'CAM-BPS-008', videoUrl: '/videos/video_4.mp4' }
  ]);

  // Selected zone to display in the main monitor
  const [selectedZoneId, setSelectedZoneId] = useState(1);
  const activeZone = zones.find(z => z.id === selectedZoneId);

  // Handle automatic timer and vehicle count changes
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prevZones => prevZones.map(zone => {
        let newTimer = zone.timer;
        let newSignal = zone.signal;
        
        // Time logic in Automatic mode
        if (controlMode === 'Automatic') {
          newTimer -= 1;
          if (newTimer <= 0) {
            if (newSignal === 'Green') { newSignal = 'Yellow'; newTimer = 5; }
            else if (newSignal === 'Yellow') { newSignal = 'Red'; newTimer = Math.floor(Math.random() * 30) + 30; } // 30-60s
            else if (newSignal === 'Red') { newSignal = 'Green'; newTimer = Math.floor(Math.random() * 30) + 30; }
          }
        } else {
          // In Manual mode, maybe the timer stays frozen or counts up to show how long it has been in this state.
          // Let's just keep it at 0 or simply not count down if manually controlled.
        }
        
        // Randomly adjust vehicles for dynamics
        // Fluctuate between -8 to +8
        const vehicleChange = Math.floor(Math.random() * 17) - 8;
        let newVehicles = Math.max(0, zone.vehicles + vehicleChange);
        
        // Adjust congestion based on vehicle count
        let newCongestion = 'LOW';
        if (newVehicles > 1000) newCongestion = 'HIGH';
        else if (newVehicles > 600) newCongestion = 'MEDIUM';
        
        return { ...zone, timer: newTimer, signal: newSignal, vehicles: newVehicles, congestion: newCongestion };
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [controlMode]);

  const handleManualSignalChange = (color) => {
    if (controlMode !== 'Manual') return;
    setZones(prevZones => prevZones.map(zone => {
       if (zone.id === selectedZoneId) {
          // When manually changing, set it and reset a dummy timer
          return { ...zone, signal: color, timer: 0 };
       }
       return zone;
    }));
  };

  const getCongestionColor = (level) => {
    if (level === 'HIGH') return 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40';
    if (level === 'MEDIUM') return 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/40';
    return 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/40';
  };

  const getSignalColorClass = (currentSignal, targetColor) => {
    const active = currentSignal === targetColor;
    if (targetColor === 'Red') return active ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-red-900/50';
    if (targetColor === 'Yellow') return active ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 'bg-yellow-900/50';
    if (targetColor === 'Green') return active ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'bg-green-900/50';
  };

  const openZoneInMaps = (zone) => {
    const mapsUrl = `https://www.google.com/maps?q=${zone.latitude},${zone.longitude}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleZoneCardClick = (zone) => {
    setSelectedZoneId(zone.id);
  };

  const handleZoneMapClick = (event, zone) => {
    event.stopPropagation();
    openZoneInMaps(zone);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-6 font-sans text-[#0F172A]">
      
      {/* Alert Strip */}
      <div className="flex flex-col gap-3 mb-6 relative z-10">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border-l-4" style={{ borderLeftColor: alert.colorHex }}>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${alert.bgClass}`}>
                {alert.type === 'violation' ? (
                  <svg className={`w-4 h-4 ${alert.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                ) : (
                  <svg className={`w-4 h-4 ${alert.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">{alert.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded">{alert.location}</span>
                  <span className="text-xs text-gray-400">{alert.time}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Active Emergencies Box */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-3 animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-red-800">Active Emergencies</h3>
            <p className="text-sm font-semibold text-red-600 mt-0.5">System ready to activate green corridor when needed</p>
          </div>
        </div>
        <div className="hidden sm:flex animate-pulse bg-white px-4 py-2 rounded shadow text-red-700 text-sm font-black tracking-widest border border-red-200">
          TRACKING ACTIVE
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        
        {/* Left Column - Video Feed */}
        <div className="lg:w-[50%] xl:w-[60%] flex flex-col">
          <div className="bg-[#1E293B] rounded-lg shadow-md h-full min-h-[400px] flex items-center justify-center relative overflow-hidden group border border-slate-700">
            {/* The Video Element */}
            <video 
               key={activeZone?.videoUrl || activeZone?.id}
               src={activeZone?.videoUrl || "/videos/Hikvision_Traffic_Flow_Analysis_Camera_240P.mp4"} 
               autoPlay 
               loop 
               muted 
               className="object-cover w-full h-full absolute inset-0 z-0"
               onError={(e) => {
                 e.target.style.display = 'none';
               }}
            />
            {/* Dark gradient overlay to make text readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-0"></div>

            {/* Top Left Label */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#0F172A]/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-600 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse"></div>
              <span className="text-white text-sm font-semibold tracking-wide">{activeZone?.name}</span>
            </div>

            {/* Agent Insight Overlay */}
            <div className="absolute top-16 left-4 z-10 max-w-[200px] pointer-events-none">
              <div className="bg-blue-600/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-xl border border-blue-400 animate-in fade-in slide-in-from-left duration-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Agent Insight</span>
                </div>
                <p className="text-[11px] text-blue-50 font-medium leading-tight">
                  {activeZone?.congestion === 'HIGH' 
                    ? "SITA is extending Green phase by 15s to clear heavy backlog." 
                    : "Maintaining optimal balance between pedestrian and vehicle flow."}
                </p>
              </div>
            </div>

            {/* Top Right Label - Live Clock & Date */}
            <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded border border-slate-600 shadow-lg font-mono text-sm text-white">
              {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </div>

            {/* Bottom Overlay Texts */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
               <span className="font-mono text-sm font-bold text-white bg-blue-600/90 px-3 py-1 rounded shadow-lg border border-blue-500">{activeZone?.cam}</span>
               <span className="font-mono text-xs text-white bg-black/80 px-2 py-1.5 rounded border border-gray-600">FPS: 30</span>
            </div>
            
            {/* Huge Timer Overlay at Bottom Right */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1">
               <span className="text-xs font-bold text-gray-200 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded shadow">Active Signal Timer</span>
               <div className={`font-mono text-4xl font-black bg-black/80 px-4 py-2 rounded-lg border-2 shadow-2xl backdrop-blur-sm flex items-center gap-3 ${
                 activeZone?.signal === 'Red' ? 'text-red-500 border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.5)]' :
                 activeZone?.signal === 'Yellow' ? 'text-yellow-400 border-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.5)]' :
                 'text-[#10B981] border-[#10B981]/70 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
               }`}>
                 <div className={`w-4 h-4 rounded-full animate-pulse ${
                    activeZone?.signal === 'Red' ? 'bg-red-500' :
                    activeZone?.signal === 'Yellow' ? 'bg-yellow-400' : 'bg-[#10B981]'
                 }`}></div>
                 0:{activeZone?.timer < 10 ? `0${Math.max(0, activeZone.timer)}` : Math.max(0, activeZone.timer)}
               </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stat Cards & Controls */}
        <div className="lg:w-[50%] xl:w-[40%] flex flex-col justify-between gap-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card: Vehicle Count */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Live Flow Rate</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mt-2 tabular-nums">{activeZone?.vehicles} <span className="text-sm font-medium text-slate-400">vehicles</span></h2>
            </div>

            {/* Card: Congestion */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Saturation State</p>
              <div className="mt-2 text-left">
                <span className={`px-4 py-2 rounded-full font-black tracking-widest text-[10px] uppercase border inline-block ${getCongestionColor(activeZone?.congestion)}`}>
                  {activeZone?.congestion}
                </span>
              </div>
            </div>
          </div>

          {/* Adaptive Signal Control Panel */}
          <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
               <div>
                 <h3 className="text-lg font-black text-[#0F172A] tracking-tight">Signal Matrix</h3>
                 <p className="text-xs font-bold text-gray-400">Autonomous & Manual Override</p>
               </div>
               
               {/* Toggle Switch */}
               <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start sm:self-auto">
                 <button 
                  onClick={() => setControlMode('Automatic')}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${controlMode === 'Automatic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Auto
                 </button>
                 <button 
                  onClick={() => setControlMode('Manual')}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${controlMode === 'Manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Manual
                 </button>
               </div>
             </div>
             
             <div className="flex items-center gap-6 mt-2 pb-2">
                {/* Traffic Light UI */}
                <div className="bg-slate-800 p-3 rounded-xl border-4 border-slate-900 inline-flex flex-col gap-3 shadow-lg">
                   {/* Red */}
                   <button 
                     onClick={() => handleManualSignalChange('Red')}
                     disabled={controlMode === 'Automatic'}
                     className={`w-10 h-10 rounded-full transition-all duration-300 border-2 border-black/50 ${getSignalColorClass(activeZone?.signal, 'Red')} ${controlMode === 'Manual' && activeZone?.signal !== 'Red' ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                   ></button>
                   {/* Yellow */}
                   <button 
                     onClick={() => handleManualSignalChange('Yellow')}
                     disabled={controlMode === 'Automatic'}
                     className={`w-10 h-10 rounded-full transition-all duration-300 border-2 border-black/50 ${getSignalColorClass(activeZone?.signal, 'Yellow')} ${controlMode === 'Manual' && activeZone?.signal !== 'Yellow' ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                   ></button>
                   {/* Green */}
                   <button 
                     onClick={() => handleManualSignalChange('Green')}
                     disabled={controlMode === 'Automatic'}
                     className={`w-10 h-10 rounded-full transition-all duration-300 border-2 border-black/50 ${getSignalColorClass(activeZone?.signal, 'Green')} ${controlMode === 'Manual' && activeZone?.signal !== 'Green' ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                   ></button>
                </div>
                
                {/* Signal Info */}
                <div className="flex-1 flex flex-col justify-center">
                   <p className="text-sm text-gray-500 mb-1">Active Signal Timer</p>
                   {controlMode === 'Automatic' ? (
                     <div className="flex items-baseline gap-2">
                       <h2 className="text-5xl font-bold text-[#0F172A] tabular-nums leading-none">
                         0:{activeZone?.timer < 10 ? `0${Math.max(0, activeZone.timer)}` : Math.max(0, activeZone.timer)}
                       </h2>
                       <span className="text-gray-400 font-medium">sec</span>
                     </div>
                   ) : (
                     <div className="text-2xl font-bold italic text-gray-400">Manual Override</div>
                   )}
                   
                   <div className="mt-4 flex flex-col gap-2">
                      <div className={`px-3 py-1.5 rounded inline-flex items-center text-xs font-bold border max-w-max ${
                        controlMode === 'Automatic' 
                          ? 'bg-blue-50 text-blue-600 border-blue-200' 
                          : 'bg-orange-50 text-orange-600 border-orange-200'
                      }`}>
                        {controlMode === 'Automatic' ? (
                           <><svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path></svg> AI Optimizing</>
                        ) : (
                           <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> Admin Override Active</>
                        )}
                      </div>
                      {controlMode === 'Manual' && (
                        <p className="text-xs text-slate-500">Click on the traffic light indicators to manually switch the signal.</p>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Bottom Horizontal Row of 4 Zone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {zones.map((zone) => (
          <div 
            key={zone.id} 
            onClick={() => handleZoneCardClick(zone)}
            className={`bg-white p-5 rounded-lg shadow-sm border flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-300 ${selectedZoneId === zone.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-100 hover:border-blue-200'}`}
          >
            <div className="flex justify-between items-start mb-6">
               <div>
                 <h4 className="font-bold text-[#0F172A] text-base leading-tight">{zone.name}</h4>
                 <p className="text-xs text-gray-400 mt-1">Zone ID: {zone.id}</p>
               </div>
               <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider border ${getCongestionColor(zone.congestion)}`}>
                 {zone.congestion}
               </span>
            </div>
            <div className="flex justify-between items-end">
               <div className="flex flex-col">
                 <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Vehicles</span>
                 <span className="text-3xl font-bold text-[#0F172A] tabular-nums mt-1">{zone.vehicles}</span>
                 <button
                   type="button"
                   onClick={(event) => handleZoneMapClick(event, zone)}
                   className="text-[11px] text-blue-600 font-semibold mt-2 underline underline-offset-2 text-left hover:text-blue-700 cursor-pointer"
                 >
                   Click here to view actual view in map
                 </button>
               </div>
               
               {/* Live Signal Indicator */}
               <div className="flex flex-col items-center gap-1 bg-slate-100 p-1.5 rounded text-[10px] font-bold text-slate-500">
                  <div className={`w-3 h-3 rounded-full ${zone.signal === 'Red' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)]' : 'bg-red-900/30'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${zone.signal === 'Yellow' ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,1)]' : 'bg-yellow-900/30'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${zone.signal === 'Green' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,1)]' : 'bg-green-900/30'}`}></div>
               </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
