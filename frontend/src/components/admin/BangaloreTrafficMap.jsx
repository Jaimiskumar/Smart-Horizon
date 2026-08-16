import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Siren, 
  Volume2, 
  Wrench, 
  Shield, 
  Zap, 
  Layers, 
  RotateCw, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  RefreshCw, 
  ChevronRight, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  Flame,
  Radio,
  Eye,
  Sliders,
  Sparkles,
  Search,
  ExternalLink,
  Map as MapIcon,
  Building2,
  Car
} from 'lucide-react';
import { BANGALORE_LANDMARKS, CONGESTION_CATEGORIES, BANGALORE_CENTER } from '../../config/bangaloreGeospatial';

export default function BangaloreTrafficMap() {
  // Operational City Selector State
  const [selectedCity, setSelectedCity] = useState('bengaluru');
  const [zones, setZones] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'
  const [searchQuery, setSearchQuery] = useState('');

  // Map Controls & Layer Visibility Toggles
  const [mapZoom, setMapZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeLayers, setActiveLayers] = useState({
    hotspots: true,
    incidents: true,
    predictions: true,
    infrastructure: true,
    emergency: true,
    noise: true,
    signals: true,
    corridors: true
  });

  // Google Maps SDK State
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(false);
  const googleMapRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleMarkersRef = useRef([]);

  // Socket.IO Live Events Feed
  const [recentLiveEvents, setRecentLiveEvents] = useState([]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // 1. Fetch Bangalore Zones & Hotspots from Backend
  const fetchBangaloreData = async () => {
    try {
      const [zonesRes, hotspotsRes] = await Promise.all([
        axios.get('/api/bangalore/zones'),
        axios.get('/api/bangalore/hotspots')
      ]);

      if (zonesRes.data?.zones) {
        setZones(zonesRes.data.zones);
        // Default select Silk Board
        if (!selectedZone) {
          const defaultSilk = zonesRes.data.zones.find(z => z.zone_id === 'BLR-SILK-01') || zonesRes.data.zones[0];
          setSelectedZone(defaultSilk);
        }
      }

      if (hotspotsRes.data?.hotspots) {
        setHotspots(hotspotsRes.data.hotspots);
      }
    } catch (err) {
      console.warn('Bangalore API fetch fallback to local landmarks:', err.message);
      setZones(BANGALORE_LANDMARKS.map(lm => ({
        zone_id: lm.id,
        name: lm.name,
        latitude: lm.lat,
        longitude: lm.lng,
        road: 'Bangalore Arterial Network',
        current_vehicle_density: 1500,
        average_speed: 12.0,
        congestion_level: lm.defaultLevel,
        risk_level: lm.defaultLevel === 'DARK_RED' ? 'CRITICAL' : 'HIGH',
        noise_level: 88.0,
        incident_count: lm.defaultLevel === 'DARK_RED' ? 2 : 1,
        prediction_30min: { queue_m: 1400, speed: 8.0, trend: 'HIGH' },
        recommendation: { action: 'Dynamic Signal Offset', expected_delay_reduction_percent: 35, confidence: 0.92 }
      })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBangaloreData();
    const interval = setInterval(fetchBangaloreData, 15000);
    return () => clearInterval(interval);
  }, []);

  // 2. Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    socket.on('bangalore_zone_updated', (updatedZone) => {
      setZones(prev => prev.map(z => z.zone_id === updatedZone.zone_id ? updatedZone : z));
      setRecentLiveEvents(prev => [{
        id: Date.now(),
        type: 'ZONE_UPDATE',
        text: `Live update at ${updatedZone.name}: ${updatedZone.average_speed} km/h (${updatedZone.congestion_level})`,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 10));
    });

    socket.on('green_corridor_activated', (data) => {
      toast.success(`🚑 Bengaluru Green Corridor Active: ${data.vehicleId || 'AMB-BLR-07'} to ${data.destination || 'Hospital'}!`, { duration: 6000 });
      setRecentLiveEvents(prev => [{
        id: Date.now(),
        type: 'GREEN_CORRIDOR',
        text: `Green Wave Active for ${data.vehicleId || 'AMB-BLR-07'} (${data.destination || 'Hospital'})`,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 10));
      fetchBangaloreData();
    });

    socket.on('bangalore_incident_created', (data) => {
      toast.error(`⚠️ New Incident Ingested: ${data.title} in ${data.zone_id}`, { duration: 5000 });
      fetchBangaloreData();
    });

    return () => socket.disconnect();
  }, []);

  // 3. Google Maps SDK Dynamic Loader (Zero crash if key missing)
  useEffect(() => {
    if (!apiKey) {
      setGoogleMapsError(true);
      return;
    }

    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      initGoogleMap();
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleMapsLoaded(true);
        initGoogleMap();
      };
      script.onerror = () => {
        setGoogleMapsError(true);
      };
      document.head.appendChild(script);
    }
  }, [apiKey]);

  const initGoogleMap = () => {
    if (!googleMapRef.current || !window.google || !window.google.maps) return;

    try {
      const map = new window.google.maps.Map(googleMapRef.current, {
        center: BANGALORE_CENTER,
        zoom: 12,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0284c7' }] }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false
      });

      googleMapInstanceRef.current = map;
      renderGoogleMarkers(map);
    } catch (e) {
      console.warn('Google maps init error:', e.message);
      setGoogleMapsError(true);
    }
  };

  const renderGoogleMarkers = (map) => {
    if (!map || !window.google) return;

    // Clear old markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    zones.forEach(zone => {
      const color = CONGESTION_CATEGORIES[zone.congestion_level]?.colorHex || '#EF4444';
      
      // Marker
      const marker = new window.google.maps.Marker({
        position: { lat: zone.latitude, lng: zone.longitude },
        map: map,
        title: zone.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: zone.congestion_level === 'DARK_RED' ? 14 : (zone.congestion_level === 'RED' ? 12 : 9),
          fillColor: color,
          fillOpacity: 0.85,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        setSelectedZone(zone);
      });

      googleMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (googleMapInstanceRef.current && zones.length > 0) {
      renderGoogleMarkers(googleMapInstanceRef.current);
    }
  }, [zones]);

  // Center Google Map or Vector Map on selected zone
  const focusOnZone = (zone) => {
    setSelectedZone(zone);
    if (googleMapInstanceRef.current && window.google) {
      googleMapInstanceRef.current.panTo({ lat: zone.latitude, lng: zone.longitude });
      googleMapInstanceRef.current.setZoom(14);
    } else {
      // Vector canvas center calculation
      const xPercent = ((zone.longitude - 77.52) / (77.78 - 77.52)) * 100;
      const yPercent = (1 - (zone.latitude - 12.82) / (13.12 - 12.82)) * 100;
      setPanOffset({ x: (50 - xPercent) * 6, y: (50 - yPercent) * 6 });
      setMapZoom(1.4);
    }
  };

  // Vector Simulation Canvas Mouse Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Trigger Emergency Wave from UI
  const triggerBangaloreGreenCorridor = async () => {
    try {
      const toastId = toast.loading('Orchestrating Bengaluru Emergency Green Wave...');
      const res = await axios.post('/api/bangalore/emergency-corridor', {
        vehicle_id: 'AMB-BLR-07',
        start_zone: selectedZone?.name || 'Electronic City',
        destination: 'St. John\'s Hospital (Koramangala Corridor)',
        route: ['Electronic City', 'Silk Board', 'Koramangala 80ft', 'St. John\'s Hospital']
      });

      if (res.data?.success) {
        toast.success(`Green Wave Executed! Target ETA: 4.5 mins along Hosur Road corridor.`, { id: toastId, duration: 6000 });
        fetchBangaloreData();
      }
    } catch (e) {
      toast.error('Emergency wave execution notice');
    }
  };

  // Filtered hotspots
  const filteredHotspots = hotspots.filter(h => {
    const matchesSearch = h.location.toLowerCase().includes(searchQuery.toLowerCase()) || h.road.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterSeverity === 'ALL') return matchesSearch;
    if (filterSeverity === 'CRITICAL') return matchesSearch && h.current_congestion === 'DARK_RED';
    if (filterSeverity === 'HIGH') return matchesSearch && (h.current_congestion === 'RED' || h.current_congestion === 'DARK_RED');
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      
      {/* ── Top Hero & Operational City Selector ── */}
      <div className="bg-[#0F172A] text-white p-8 md:p-10 rounded-b-[3rem] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/15 via-indigo-600/10 to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5">
                <MapIcon className="w-3.5 h-3.5" /> BENGALURU GEOSPATIAL INTELLIGENCE LAYER
              </span>
              <span className="text-slate-600">|</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                Primary Operational City (Live Demo)
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Bengaluru <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Traffic Intelligence Map</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium max-w-3xl text-sm md:text-base leading-relaxed">
              Real-time multi-modal geospatial telemetry across Silk Board, Outer Ring Road, Bellandur, Hebbal, Tin Factory, and Electronic City. Synchronized with UrbanFlow 10-Agent AI Core.
            </p>
          </div>

          {/* Operational City Switcher & Telemetry Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Operational City</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedCity('bengaluru')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    selectedCity === 'bengaluru' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Bengaluru (Primary)
                </button>
                <button
                  onClick={() => setSelectedCity('solapur')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCity === 'solapur' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Solapur (Node)
                </button>
              </div>
            </div>

            <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center min-w-[120px]">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Tracked Zones</p>
              <p className="text-2xl font-black text-emerald-400 font-mono">{zones.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1550px] mx-auto px-4 md:px-8 space-y-6">
        
        {/* ── Layer Toggles & Status Bar ── */}
        <div className="bg-white rounded-3xl p-4 md:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Active Layers Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Layers className="w-4 h-4 text-blue-600" /> Layers:
            </span>

            {[
              { id: 'hotspots', label: 'Congestion Hotspots', icon: Flame, color: 'text-rose-600 bg-rose-50' },
              { id: 'incidents', label: 'Road Incidents', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
              { id: 'predictions', label: 'Queue Predictions', icon: Activity, color: 'text-blue-600 bg-blue-50' },
              { id: 'infrastructure', label: 'Potholes / Work Orders', icon: Wrench, color: 'text-indigo-600 bg-indigo-50' },
              { id: 'emergency', label: 'Emergency Vehicles & Waves', icon: Siren, color: 'text-red-600 bg-red-50' },
              { id: 'noise', label: 'Noise Hotspots', icon: Volume2, color: 'text-purple-600 bg-purple-50' },
              { id: 'signals', label: 'Signal Junctions', icon: Radio, color: 'text-emerald-600 bg-emerald-50' }
            ].map(layer => {
              const active = activeLayers[layer.id];
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id] }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    active 
                      ? `${layer.color} border-current shadow-xs` 
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <layer.icon className="w-3.5 h-3.5" />
                  {layer.label}
                </button>
              );
            })}
          </div>

          {/* Map Engine Badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full border uppercase ${
              apiKey && googleMapsLoaded 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {apiKey && googleMapsLoaded 
                ? '🗺️ Google Maps SDK Active' 
                : '🗺️ Interactive Bengaluru Simulation Vector Engine'}
            </span>
          </div>

        </div>

        {/* ── Main Map & Hotspots Split View ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Interactive Map Canvas (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            <div className="bg-[#0F172A] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative h-[650px] flex flex-col justify-between select-none">
              
              {/* Map Floating HUD Header */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4 pointer-events-none">
                
                <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 pointer-events-auto shadow-lg flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <div>
                    <p className="text-xs font-black text-white">Bengaluru Metro Grid Live</p>
                    <p className="text-[10px] text-slate-400 font-mono">15 Key Corridors Monitored</p>
                  </div>
                </div>

                {/* Map Control Buttons */}
                <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 pointer-events-auto flex items-center gap-1 shadow-lg">
                  <button 
                    onClick={() => setMapZoom(prev => Math.min(prev + 0.2, 2.5))}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMapZoom(prev => Math.max(prev - 0.2, 0.7))}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setMapZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold font-mono"
                    title="Reset View"
                  >
                    Reset
                  </button>
                </div>

              </div>

              {/* Map Render Target (Google Maps or Vector Fallback) */}
              {apiKey && !googleMapsError ? (
                <div ref={googleMapRef} className="w-full h-full z-10" />
              ) : (
                /* Interactive Bangalore Vector Simulation Canvas Engine */
                <div 
                  className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0B1120] to-[#0F172A] cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Grid Lines Background */}
                  <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none">
                    <defs>
                      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38BDF8" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                  </svg>

                  {/* Scalable Container for Zones & Vectors */}
                  <div 
                    className="w-full h-full relative transition-transform duration-100 ease-out"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapZoom})`,
                      transformOrigin: 'center center'
                    }}
                  >
                    
                    {/* Render Main Corridor Lines */}
                    {activeLayers.corridors && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600">
                        {/* Outer Ring Road Spine */}
                        <path 
                          d="M 280 160 Q 480 180 580 320 T 430 460 Q 320 480 260 400" 
                          fill="none" 
                          stroke="#EF4444" 
                          strokeWidth="5" 
                          strokeDasharray="6 4" 
                          className="opacity-70 animate-pulse"
                        />
                        {/* Hosur Road Express Arterial */}
                        <path 
                          d="M 430 460 L 520 540" 
                          fill="none" 
                          stroke="#F59E0B" 
                          strokeWidth="6" 
                          className="opacity-80"
                        />
                        {/* Airport Expressway NH 44 */}
                        <path 
                          d="M 380 320 L 380 80" 
                          fill="none" 
                          stroke="#10B981" 
                          strokeWidth="5" 
                          className="opacity-80"
                        />
                      </svg>
                    )}

                    {/* Render Interactive Bangalore Zones */}
                    {zones.map((zone) => {
                      // Normalize Bangalore lat/lng to percentage bounds (Lat: 12.82 to 13.12, Lng: 77.52 to 77.78)
                      const leftPercent = ((zone.longitude - 77.52) / (77.78 - 77.52)) * 85 + 7;
                      const topPercent = (1 - (zone.latitude - 12.82) / (13.12 - 12.82)) * 85 + 7;
                      const category = CONGESTION_CATEGORIES[zone.congestion_level] || CONGESTION_CATEGORIES.RED;
                      const isSelected = selectedZone?.zone_id === zone.zone_id;
                      const isCritical = zone.congestion_level === 'DARK_RED' || zone.congestion_level === 'RED';

                      return (
                        <div
                          key={zone.zone_id}
                          onClick={() => setSelectedZone(zone)}
                          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-transform duration-200 hover:scale-125"
                          style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                        >
                          {/* Radial Pulse for High-Risk Zones */}
                          {isCritical && (
                            <div 
                              className="absolute -inset-4 rounded-full opacity-40 animate-ping pointer-events-none"
                              style={{ backgroundColor: category.colorHex }}
                            ></div>
                          )}

                          {/* Outer Congestion Ring */}
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${
                              isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                            }`}
                            style={{ 
                              backgroundColor: `${category.colorHex}dd`,
                              borderColor: '#ffffff'
                            }}
                          >
                            {zone.emergency_corridor?.active ? (
                              <Siren className="w-5 h-5 text-white animate-pulse" />
                            ) : (zone.infrastructure_issue?.has_issue ? (
                              <Wrench className="w-4 h-4 text-white" />
                            ) : (zone.noise_hotspot?.is_hotspot ? (
                              <Volume2 className="w-4 h-4 text-white" />
                            ) : (
                              <Car className="w-4 h-4 text-white" />
                            )))}
                          </div>

                          {/* Hover Tooltip & Name Label */}
                          <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-black font-sans whitespace-nowrap shadow-xl flex items-center gap-1.5 pointer-events-none">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.colorHex }}></span>
                            {zone.name}
                            <span className="text-slate-400 font-mono">({zone.average_speed} km/h)</span>
                          </div>

                        </div>
                      );
                    })}

                  </div>

                </div>
              )}

              {/* Map Floating Footer Legend & Emergency Quick Action */}
              <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-20">
                
                {/* Congestion Scale Legend */}
                <div className="flex items-center gap-3 flex-wrap text-[11px] font-bold text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px] font-black">Congestion Scale:</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal (&gt;35k)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Heavy</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Severe</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-950 border border-rose-500"></span> Critical Hotspot (&lt;8k)</span>
                </div>

                <button
                  onClick={triggerBangaloreGreenCorridor}
                  className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all active:scale-95 shrink-0"
                >
                  <Siren className="w-3.5 h-3.5" />
                  Test Hosur Green Wave
                </button>

              </div>

            </div>

            {/* Live Socket.IO Ticker for Bangalore Events */}
            {recentLiveEvents.length > 0 && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black text-[10px]">LIVE FEED</span>
                  <span className="text-slate-300 truncate">{recentLiveEvents[0].text}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">[{recentLiveEvents[0].time}]</span>
              </div>
            )}

          </div>

          {/* RIGHT: Ranked Hotspots Panel & Selected Zone Drawer (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* ── Hotspots Ranked List Panel ── */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Bengaluru Critical Hotspots
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Ranked by severity & traffic delay impact</p>
                  </div>
                </div>
                <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-0.5 rounded-full font-mono">
                  {filteredHotspots.length} Active
                </span>
              </div>

              {/* Search & Severity Filter Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Silk Board, Hebbal, ORR..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-1">
                  {['ALL', 'CRITICAL', 'HIGH'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setFilterSeverity(sev)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        filterSeverity === sev 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotspot Scrollable List */}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {filteredHotspots.map(h => {
                  const isSelected = selectedZone?.zone_id === h.zone_id;
                  const cat = CONGESTION_CATEGORIES[h.current_congestion] || CONGESTION_CATEGORIES.RED;
                  return (
                    <div
                      key={h.zone_id}
                      onClick={() => focusOnZone(h)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-black text-slate-900 truncate">{h.location}</h4>
                        <span 
                          className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase text-white font-mono"
                          style={{ backgroundColor: cat.colorHex }}
                        >
                          {h.current_congestion.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium truncate mb-2">{h.road}</p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-xl border border-slate-200/60 mb-2 font-mono">
                        <div>
                          <span className="text-slate-400 text-[9px] block uppercase">Avg Speed:</span>
                          <strong className="text-rose-600 font-black">{h.average_speed} km/h</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block uppercase">30m Queue:</span>
                          <strong className="text-blue-600 font-black">{h.prediction_30min?.queue_m || 1500} m</strong>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-600 font-medium line-clamp-1">
                        💡 <strong className="text-slate-800">Action:</strong> {h.recommended_action}
                      </p>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* ── Selected Zone Detail Drawer ── */}
            {selectedZone && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-blue-600 font-black uppercase">
                      {selectedZone.zone_id}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{selectedZone.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedZone.road}</p>
                  </div>
                  <button 
                    onClick={() => focusOnZone(selectedZone)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-xs font-bold flex items-center gap-1"
                    title="Center in Map"
                  >
                    <Compass className="w-4 h-4" /> Focus
                  </button>
                </div>

                {/* Real-Time Telemetry Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-400 text-[9px] font-bold uppercase">Average Speed</p>
                    <p className="text-xl font-black text-rose-600 font-mono">{selectedZone.average_speed} km/h</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-400 text-[9px] font-bold uppercase">Vehicle Density</p>
                    <p className="text-xl font-black text-slate-900 font-mono">{selectedZone.current_vehicle_density} /km²</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-400 text-[9px] font-bold uppercase">Noise Telemetry</p>
                    <p className="text-lg font-black text-purple-600 font-mono">{selectedZone.noise_level || 88.0} dB</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-400 text-[9px] font-bold uppercase">Signal Mode</p>
                    <p className="text-sm font-black text-emerald-600 font-mono">{selectedZone.signal_junction?.mode || 'Adaptive'}</p>
                  </div>

                </div>

                {/* 30-min Queue Prediction Timeline */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-600" /> 30-Min Spillover Forecast</span>
                    <span className="text-rose-600 font-black">{selectedZone.prediction_30min?.trend || 'HIGH'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span>5 min: <strong>{selectedZone.prediction_5min?.queue_m || 650}m</strong></span>
                    <span>15 min: <strong>{selectedZone.prediction_15min?.queue_m || 1100}m</strong></span>
                    <span>30 min: <strong className="text-blue-700">{selectedZone.prediction_30min?.queue_m || 1850}m</strong></span>
                  </div>
                </div>

                {/* AI Recommendation Box */}
                {selectedZone.recommendation && (
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Decision Recommendation:
                    </p>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {selectedZone.recommendation.action}
                    </p>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Delay Reduction: <strong className="text-emerald-400">-{selectedZone.recommendation.expected_delay_reduction_percent}%</strong></span>
                      <span>Confidence: <strong className="text-blue-400">{(selectedZone.recommendation.confidence * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
