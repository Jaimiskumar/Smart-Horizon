import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { 
  User, 
  Car, 
  ParkingCircle, 
  Camera, 
  CreditCard, 
  QrCode, 
  Shield, 
  AlertTriangle, 
  Wind, 
  Volume2, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Send, 
  Navigation, 
  Search, 
  Monitor, 
  Sparkles,
  Map as MapIcon,
  Play,
  Activity,
  Layers,
  Wrench,
  Radio,
  Cpu,
  RefreshCw,
  Crosshair,
  UploadCloud,
  X,
  Compass,
  Zap,
  Check
} from 'lucide-react';

export default function CitizenMobileApp({ onSwitchToAdmin }) {
  // Mobile Top & Bottom Navigation
  const [citizenTab, setCitizenTab] = useState('connected'); // 'connected' | 'pedestrian' | 'parking' | 'report' | 'map' | 'fines'
  const [connectedSubTab, setConnectedSubTab] = useState('dashcam'); // 'dashcam' | 'map' | 'workorders' | 'pipeline'

  // ── 1. Connected Vehicle & Dashcam HUD State ──
  const [driverSpeed, setDriverSpeed] = useState(48.5);
  const [driverHeading, setDriverHeading] = useState(175);
  const [vehicleId, setVehicleId] = useState('ANON-VH-412');
  const [isAiScanActive, setIsAiScanActive] = useState(true);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoStage, setDemoStage] = useState('');
  
  // Real-time Community Cloud Data
  const [communityHazards, setCommunityHazards] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [pipelineEvents, setPipelineEvents] = useState([]);
  const [v2vAdvisory, setV2vAdvisory] = useState({
    active: true,
    title: '⚠️ Pothole 320m Ahead on Hosur Road',
    advisorySpeed: 30,
    severity: 'HIGH',
    suggestedAction: 'Reduce speed to 30 km/h and stay in Center Lane'
  });

  // ── 2. Pedestrian Crosswalk Shield State ──
  const [pedestrianState, setPedestrianState] = useState({
    safeToCross: false,
    crosswalkName: 'Silk Board J2 Crosswalk',
    approachingVehicle: 'VEH-021 (Sedan • 54 km/h)',
    distance: 8.5,
    timer: 18,
    isHeld: false
  });

  // ── 3. Smart Parking State ──
  const [parkingLots, setParkingLots] = useState([
    { id: 'LOT-01', name: 'Silk Board Multi-Level Plaza', total: 120, available: 34, rate: '₹30/hr', distance: '120m', zone: 'Zone A' },
    { id: 'LOT-02', name: 'Madiwala Metro Parking', total: 80, available: 14, rate: '₹25/hr', distance: '380m', zone: 'Zone B' },
    { id: 'LOT-03', name: 'Koramangala 5th Block Parking', total: 150, available: 42, rate: '₹35/hr', distance: '850m', zone: 'Zone A' }
  ]);
  const [bookedSlot, setBookedSlot] = useState(null);

  // ── 4. Camera & Live GPS Automatic Reporting State ──
  const [reportForm, setReportForm] = useState({
    category: 'pothole', // 'pothole' | 'accident' | 'road_debris' | 'hawkers_encroachment' | 'illegal_parking' | 'excessive_honking'
    title: 'Severe Road Surface Defect',
    location: 'Outer Ring Road (Near Silk Board), Bengaluru',
    latitude: 12.9176,
    longitude: 77.6238,
    accuracyMeters: 6.4,
    description: '',
    severity: 'HIGH'
  });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const fileInputRef = useRef(null);

  const [trackedTickets, setTrackedTickets] = useState([
    { id: 'CIT-BLR-8492', category: 'DANGEROUS POTHOLE', status: 'Community Verified • BBMP Dispatched', time: '5m ago', location: 'Hosur Road' },
    { id: 'CIT-BLR-8310', category: 'HAWKERS ON CROSSWALK', status: 'Notice Issued', time: '1h ago', location: 'Madiwala J2' }
  ]);

  // ── 5. AI Multi-Agent & Hotspots State ──
  const [agentsOnline, setAgentsOnline] = useState(14);
  const [bengaluruHotspots, setBengaluruHotspots] = useState([
    { name: 'Silk Board Central', risk: 'CRITICAL', delay: '+18m', speed: '14 km/h', color: 'red' },
    { name: 'Madiwala Crosswalk', risk: 'HIGH', delay: '+12m', speed: '22 km/h', color: 'amber' },
    { name: 'KR Puram Bridge', risk: 'HIGH', delay: '+15m', speed: '18 km/h', color: 'amber' },
    { name: 'Electronic City Toll', risk: 'MODERATE', delay: '+4m', speed: '48 km/h', color: 'emerald' },
    { name: 'Hebbal Flyover', risk: 'LOW', delay: '+2m', speed: '55 km/h', color: 'emerald' }
  ]);

  // ── 6. My Fines State ──
  const [myFines, setMyFines] = useState([
    { id: 'CHN-2026-94821', vehicle: 'KA-01-MJ-4821', violation: 'Over-Speeding (68km/h)', amount: 1000, status: 'UNPAID' }
  ]);

  // Canvas ref for Mobile Dashcam HUD
  const canvasRef = useRef(null);

  // ── Live Geolocation Auto-Detection ──
  const detectLiveLocation = () => {
    setIsDetectingGps(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your mobile browser');
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const latFixed = Number(latitude.toFixed(5));
        const lngFixed = Number(longitude.toFixed(5));
        
        // Approximate to Bengaluru nearest corridor if coordinates are outside or test coords
        let resolvedAddress = `GPS (${latFixed}° N, ${lngFixed}° E)`;
        if (Math.abs(latitude - 12.92) < 0.1) {
          resolvedAddress = `Hosur Road Corridor, Silk Board (${latFixed}°, ${lngFixed}°)`;
        } else {
          resolvedAddress = `Current Live GPS Location (${latFixed}°, ${lngFixed}°)`;
        }

        setReportForm(prev => ({
          ...prev,
          latitude: latFixed,
          longitude: lngFixed,
          accuracyMeters: Math.round(accuracy || 8),
          location: resolvedAddress
        }));
        setGpsDetected(true);
        setIsDetectingGps(false);
        toast.success(`📍 Live GPS Detected: ${latFixed}, ${lngFixed} (±${Math.round(accuracy || 8)}m)`);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Fallback default Bengaluru Silk Board coordinates
        setReportForm(prev => ({
          ...prev,
          latitude: 12.9176,
          longitude: 77.6238,
          accuracyMeters: 10,
          location: 'Silk Board Central Junction, Bengaluru (Default Live Pin)'
        }));
        setGpsDetected(true);
        setIsDetectingGps(false);
        toast('Using Bengaluru Smart City Live GPS coordinates', { icon: '📍' });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Auto-detect GPS on component mount
  useEffect(() => {
    detectLiveLocation();
    fetchCommunityData();

    const socket = io({ transports: ['websocket', 'polling'] });

    socket.on('hazard_reported', fetchCommunityData);
    socket.on('hazard_verified', (hazard) => {
      fetchCommunityData();
      toast.success(`Community Verified: ${hazard.title || 'Road Hazard'}!`);
    });
    socket.on('urbanflow-workorder-dispatched', (wo) => {
      fetchCommunityData();
      toast(`BBMP Work Order Dispatched: ${wo.crew}`, { icon: '🛠️' });
    });
    socket.on('v2v_proximity_warning', (data) => {
      if (data.warning) {
        setV2vAdvisory({
          active: true,
          title: data.warning.warning_text,
          advisorySpeed: data.warning.speed_advisory_kmh || 30,
          severity: data.warning.severity || 'HIGH',
          suggestedAction: 'Slow down and maintain safe following distance'
        });
        toast(data.warning.warning_text, { icon: '🚗' });
      }
    });

    socket.on('traffic_signal_recommendation', data => {
      setPedestrianState(p => ({
        ...p,
        safeToCross: true,
        timer: data.green_extension_sec || 25,
        isHeld: true
      }));
      toast.success('Crosswalk Signal Extended: Safe to Cross!');
    });

    return () => socket.disconnect();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const [hazRes, woRes, feedRes] = await Promise.all([
        axios.get('/api/urbanflow/community-cloud/hazards').catch(() => ({ data: { hazards: [] } })),
        axios.get('/api/urbanflow/work-orders').catch(() => ({ data: { workOrders: [] } })),
        axios.get('/api/urbanflow/community-cloud/event-feed').catch(() => ({ data: { feed: [] } }))
      ]);
      if (hazRes.data?.hazards) setCommunityHazards(hazRes.data.hazards);
      if (woRes.data?.workOrders) setWorkOrders(woRes.data.workOrders);
      if (feedRes.data?.feed) setPipelineEvents(feedRes.data.feed);
    } catch (e) {
      console.warn('Community data fetch error:', e.message);
    }
  };

  // ── Dashcam Canvas Animation Loop ──
  useEffect(() => {
    let animId;
    let offset = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Sky & Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // 2. Road Surface
      const roadGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h * 0.45);
      ctx.lineTo(w * 0.65, h * 0.45);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Road markings
      offset = (offset + 2.5) % 40;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.45);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Simulated Bounding Box for Pothole
      const boxX = w * 0.42;
      const boxY = h * 0.62;
      const boxW = w * 0.28;
      const boxH = h * 0.16;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Label background
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(boxX, boxY - 18, boxW, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('POTHOLE (11.5cm) • 97.4%', boxX + 4, boxY - 5);

      // Target Crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxX + boxW / 2 - 10, boxY + boxH / 2);
      ctx.lineTo(boxX + boxW / 2 + 10, boxY + boxH / 2);
      ctx.moveTo(boxX + boxW / 2, boxY + boxH / 2 - 10);
      ctx.lineTo(boxX + boxW / 2, boxY + boxH / 2 + 10);
      ctx.stroke();

      // 4. Scanline overlay if AI Scan is active
      if (isAiScanActive) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        const scanY = (Date.now() / 8) % h;
        ctx.fillRect(0, scanY, w, 4);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isAiScanActive, citizenTab]);

  // ── 1-Click Demos ──
  const runPotholeDemo = async () => {
    setIsDemoRunning(true);
    setDemoProgress(10);
    setDemoStage('Dashcam AI detecting pothole on Hosur Road...');
    try {
      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(35);
      setDemoStage('Publishing report to Community Road Safety Cloud...');

      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(65);
      setDemoStage('Vehicle ANON-VH-885 verified hazard (Status: COMMUNITY_VERIFIED)...');

      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(85);
      setDemoStage('V2V broadcast sent to same-route vehicles & BBMP Work Order created...');

      const res = await axios.post('/api/urbanflow/connected-vehicle/demo/pothole');
      setDemoProgress(100);
      setDemoStage('Demo completed! Work order dispatched to BBMP Quick-Fix Unit #4.');
      fetchCommunityData();
      toast.success('Pothole Demo Successfully Executed!');
    } catch (e) {
      toast.error(`Demo failed: ${e.message}`);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const runAccidentDemo = async () => {
    setIsDemoRunning(true);
    setDemoProgress(15);
    setDemoStage('Lead vehicle sudden deceleration (10.8 m/s²) - Collision Detected...');
    try {
      await new Promise(r => setTimeout(r, 700));
      setDemoProgress(50);
      setDemoStage('V2V Secondary Collision Warning broadcasted to approaching traffic...');

      await new Promise(r => setTimeout(r, 700));
      setDemoProgress(80);
      setDemoStage('12-Agent Matrix formulating dynamic rerouting & green corridor...');

      const res = await axios.post('/api/urbanflow/connected-vehicle/demo/accident');
      setDemoProgress(100);
      setDemoStage('Multi-agent consensus formulated & verified!');
      fetchCommunityData();
      toast.success('Accident + V2V Demo Executed!');
    } catch (e) {
      toast.error(`Demo failed: ${e.message}`);
    } finally {
      setIsDemoRunning(false);
    }
  };

  // ── Camera Photo Capture Handler ──
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedPhoto(ev.target.result);
        toast.success('📸 Photo Attached & Geo-tagged!');
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Submit Citizen Report (Connected to Community Cloud) ──
  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportForm.description) {
      toast.error('Please enter a short description');
      return;
    }

    setIsSubmittingReport(true);
    try {
      // 1. Post to Community Cloud service
      await axios.post('/api/urbanflow/community-cloud/report', {
        vehicle_id: `MOBILE-CIT-${Math.floor(100 + Math.random() * 900)}`,
        category: reportForm.category.toUpperCase(),
        title: reportForm.title || `${reportForm.category.toUpperCase()} on ${reportForm.location}`,
        road_name: reportForm.location,
        latitude: reportForm.latitude,
        longitude: reportForm.longitude,
        confidence: 0.96,
        description: reportForm.description,
        photo_url: capturedPhoto
      });

      const ticketId = `CIT-BLR-${Math.floor(1000 + Math.random() * 9000)}`;
      setTrackedTickets(prev => [
        {
          id: ticketId,
          category: reportForm.category.replace(/_/g, ' ').toUpperCase(),
          status: 'AI Validated • Community Cloud Published',
          time: 'Just now',
          location: reportForm.location
        },
        ...prev
      ]);

      fetchCommunityData();
      toast.success(`Report Submitted & Pinned to Community Cloud! (Ticket: ${ticketId})`);
      setReportForm(p => ({ ...p, description: '' }));
      setCapturedPhoto(null);
    } catch (err) {
      toast.error(`Submission error: ${err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleRequestHold = () => {
    setPedestrianState(p => ({ ...p, safeToCross: true, timer: 25, isHeld: true }));
    toast.success('Requested extra 25s pedestrian green phase!');
  };

  const handleBookParking = (lot) => {
    const ticket = {
      passId: `PRK-QR-${Date.now().toString().slice(-6)}`,
      lotName: lot.name,
      slot: `Bay #${Math.floor(10 + Math.random() * 80)}`,
      rate: lot.rate,
      time: 'Valid for next 2 Hours',
      zone: lot.zone
    };
    setBookedSlot(ticket);
    toast.success(`Reserved parking at ${lot.name}!`);
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* ── MOBILE CITIZEN APP HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-3.5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-tight uppercase">Smart City Citizen & OBU</h1>
                <span className="bg-white/20 text-white text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">
                  BLR LIVE
                </span>
              </div>
              <p className="text-[10px] text-emerald-100 font-mono">
                {gpsDetected ? `📍 ${reportForm.latitude.toFixed(3)}, ${reportForm.longitude.toFixed(3)}` : 'Detecting GPS...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1 text-[10px] font-bold bg-black/25 hover:bg-black/40 text-white px-2.5 py-1 rounded-lg border border-white/20 transition-all"
            >
              <Shield className="w-3 h-3 text-emerald-200" />
              Police Login
            </button>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>V2V DSRC / C-V2X: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-100">
            <Cpu className="w-3 h-3 text-indigo-300" />
            <span>{agentsOnline}/14 AI Agents</span>
          </div>
        </div>
      </div>

      {/* ── MOBILE SCREEN CONTENT ── */}
      <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">

        {/* ════ TAB 1: CONNECTED VEHICLE & DASHCAM AI HUB ════ */}
        {citizenTab === 'connected' && (
          <div className="space-y-3.5 animate-fade-in">
            
            {/* 1-Click Demo Quick Trigger Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  1-Click Interactive Demos
                </span>
                <span className="text-[9px] font-mono text-slate-400">Hardware-Ready Simulation</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={runPotholeDemo}
                  disabled={isDemoRunning}
                  className="py-2.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white text-[10px] font-extrabold rounded-xl shadow-xs active:scale-95 disabled:opacity-50"
                >
                  🚀 Pothole Flow Demo
                </button>
                <button
                  onClick={runAccidentDemo}
                  disabled={isDemoRunning}
                  className="py-2.5 px-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white text-[10px] font-extrabold rounded-xl shadow-xs active:scale-95 disabled:opacity-50"
                >
                  🚨 Accident + V2V Demo
                </button>
              </div>

              {isDemoRunning && (
                <div className="pt-1 space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 transition-all duration-300"
                      style={{ width: `${demoProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">{demoStage}</p>
                </div>
              )}
            </div>

            {/* Sub-Tabs for Connected Vehicle Hub */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-[10px] font-bold">
              <button
                onClick={() => setConnectedSubTab('dashcam')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  connectedSubTab === 'dashcam' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Dashcam HUD
              </button>
              <button
                onClick={() => setConnectedSubTab('map')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  connectedSubTab === 'map' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Safety Map ({communityHazards.length})
              </button>
              <button
                onClick={() => setConnectedSubTab('workorders')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  connectedSubTab === 'workorders' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                BBMP Orders ({workOrders.length})
              </button>
              <button
                onClick={() => setConnectedSubTab('pipeline')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  connectedSubTab === 'pipeline' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Live Feed
              </button>
            </div>

            {/* SUB-TAB 1: LIVE DASHCAM HUD CANVAS */}
            {connectedSubTab === 'dashcam' && (
              <div className="space-y-3">
                {/* Dashcam Video Canvas */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 relative shadow-md">
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={190}
                    className="w-full h-auto block"
                  />
                  
                  {/* Top HUD Overlay */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-emerald-400">
                    <span className="bg-black/60 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      REC • DASHCAM AI CAM-01
                    </span>
                    <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20 text-white">
                      {vehicleId}
                    </span>
                  </div>

                  {/* Bottom AI Overlay Bar */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white">
                    <span className="bg-black/60 px-1.5 py-0.5 rounded">
                      GPS: 12.9261° N, 77.6763° E
                    </span>
                    <button
                      onClick={() => setIsAiScanActive(!isAiScanActive)}
                      className="bg-blue-600/80 hover:bg-blue-600 px-2 py-0.5 rounded font-bold"
                    >
                      AI Scan: {isAiScanActive ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Telemetry Gauge Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">Speed</p>
                    <p className="text-xl font-black text-slate-900">{driverSpeed} <span className="text-[10px] text-slate-400">km/h</span></p>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">Advisory</p>
                    <p className="text-xl font-black text-amber-600">{v2vAdvisory.advisorySpeed} <span className="text-[10px] text-slate-400">km/h</span></p>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">Heading</p>
                    <p className="text-xl font-black text-indigo-600">{driverHeading}° <span className="text-[10px] text-slate-400">S</span></p>
                  </div>
                </div>

                {/* Incoming V2V Proximity Alert Banner */}
                {v2vAdvisory.active && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Live V2V Proximity Alert
                      </span>
                      <span className="bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">
                        Same Route Match
                      </span>
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-900">{v2vAdvisory.title}</h3>
                    <p className="text-[10px] text-slate-600 font-medium">{v2vAdvisory.suggestedAction}</p>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: COMMUNITY SAFETY MAP */}
            {connectedSubTab === 'map' && (
              <div className="space-y-2.5">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Bengaluru Verified Road Hazards
                    </span>
                    <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {communityHazards.length} Active Pins
                    </span>
                  </div>

                  <div className="space-y-2">
                    {communityHazards.map(h => (
                      <div key={h.hazard_id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            h.status === 'COMMUNITY_VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {h.status === 'COMMUNITY_VERIFIED' ? `✓ VERIFIED (${h.verification_count})` : 'REPORTED (1)'}
                          </span>
                          <span className="font-mono font-black text-indigo-600 text-[10px]">{h.speed_advisory_kmh} km/h safe</span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{h.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">📍 {h.road} ({h.latitude}, {h.longitude})</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: BBMP WORK ORDERS */}
            {connectedSubTab === 'workorders' && (
              <div className="space-y-2.5">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    Automated BBMP Maintenance Work Orders
                  </span>
                  
                  <div className="space-y-2">
                    {workOrders.map(wo => (
                      <div key={wo.work_order_id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-blue-700 text-[10px]">{wo.work_order_id}</span>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {wo.status}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{wo.hazard_title}</p>
                        <p className="text-[10px] text-slate-600">Assigned: <strong>{wo.crew}</strong></p>
                        <p className="text-[9px] text-slate-400 font-mono">Target Resolution: {wo.resolution_target_hours} Hours</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: 6-STAGE EVENT FEED */}
            {connectedSubTab === 'pipeline' && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  6-Stage Chronological Event Stream
                </span>

                <div className="space-y-2">
                  {pipelineEvents.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0"></div>
                      <div>
                        <p className="font-bold text-slate-900">{item.event}</p>
                        <p className="text-[10px] text-slate-500">{item.details}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ════ TAB 2: LIVE CAMERA & AUTO-GPS CITIZEN REPORTING ════ */}
        {citizenTab === 'report' && (
          <div className="space-y-3.5 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-600" />
                Live Camera & GPS Incident Reporter
              </h2>
              <p className="text-xs text-slate-500">Instant AI verification and automated BBMP work order dispatch</p>
            </div>

            <form onSubmit={handleSendReport} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3 text-xs">
              
              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 font-mono">Incident Type</label>
                <select
                  value={reportForm.category}
                  onChange={e => setReportForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                >
                  <option value="pothole">🚧 Dangerous Pothole / Road Defect</option>
                  <option value="accident">🚨 Traffic Accident / Breakdown</option>
                  <option value="road_debris">🪨 Road Obstruction / Debris</option>
                  <option value="hawkers_encroachment">🏪 Hawkers Blocking Sidewalk</option>
                  <option value="illegal_parking">🅿️ Illegal Parking on Lane</option>
                  <option value="excessive_honking">📢 Excessive Honking Spike</option>
                </select>
              </div>

              {/* Automatic Live GPS Location Box */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-indigo-950 font-mono flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Auto-Detected Live GPS
                  </label>
                  <button
                    type="button"
                    onClick={detectLiveLocation}
                    disabled={isDetectingGps}
                    className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    {isDetectingGps ? 'Locating...' : 'Refresh GPS'}
                  </button>
                </div>

                <input
                  type="text"
                  value={reportForm.location}
                  onChange={e => setReportForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-slate-800 text-xs font-mono font-medium"
                />

                <div className="flex items-center justify-between text-[9px] font-mono text-indigo-700">
                  <span>Lat: {reportForm.latitude}° N, Lng: {reportForm.longitude}° E</span>
                  <span className="text-emerald-700 font-bold">Accuracy: ±{reportForm.accuracyMeters}m</span>
                </div>
              </div>

              {/* Camera Photo Upload / Capture */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 font-mono flex items-center justify-between">
                  <span>Photo Evidence (Camera / File)</span>
                  <span className="text-[10px] text-purple-600 font-normal">Auto-analyzed by YOLO AI</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {capturedPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-400 group">
                    <img src={capturedPhoto} alt="Captured Hazard" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] text-emerald-400 font-mono">
                      ✓ Ready for AI Upload
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl p-4 text-center cursor-pointer bg-purple-50/40 hover:bg-purple-50 transition flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-purple-900">Snap Photo with Camera / Select Image</p>
                    <p className="text-[10px] text-purple-500">Capture potholes, vehicle crash, or obstructions</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 font-mono">Description & Observation</label>
                <input
                  type="text"
                  value={reportForm.description}
                  onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Deep pothole on right lane causing vehicles to swerve..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {isSubmittingReport ? 'Publishing to Community Cloud...' : '🚀 Submit Verified Incident'}
              </button>
            </form>

            {/* Tracked Tickets */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 space-y-2 text-xs shadow-sm">
              <span className="font-black text-slate-800">Tracked Citizen Grievances</span>
              {trackedTickets.map((t, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{t.id} • {t.category}</p>
                    <p className="text-[10px] text-slate-500">{t.location} • {t.time}</p>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 3: PEDESTRIAN CROSSWALK SHIELD ════ */}
        {citizenTab === 'pedestrian' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className={`rounded-3xl p-5 text-center border-2 transition-all shadow-sm ${
              pedestrianState.safeToCross 
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950' 
                : 'bg-red-50 border-red-400 text-red-950'
            }`}>
              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                pedestrianState.safeToCross ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
              }`}>
                {pedestrianState.safeToCross ? '✓ SAFE TO CROSS NOW' : '⚠️ DO NOT CROSS • VEHICLE APPROACHING'}
              </span>

              <div className="my-4">
                <p className="text-5xl font-black font-mono text-slate-900">
                  {pedestrianState.timer}
                </p>
                <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">
                  {pedestrianState.safeToCross ? 'Seconds Walk Phase Remaining' : 'Signal Hold Timer'}
                </p>
              </div>

              <div className="text-xs font-mono text-slate-700 pt-2 border-t border-slate-200/80 space-y-0.5">
                <p>Location: <strong>{pedestrianState.crosswalkName}</strong></p>
                <p>Approaching: <span className="text-red-600 font-bold">{pedestrianState.approachingVehicle}</span></p>
              </div>
            </div>

            <button
              onClick={handleRequestHold}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Request Pedestrian Walk Signal (+25s)
            </button>

            {/* Environmental Quality Meter */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-blue-600" />
                  Corridor Noise & Air Quality
                </span>
                <span className="text-red-700 bg-red-100 text-[10px] font-bold px-2 py-0.5 rounded">
                  High Congestion
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <p className="text-[9px] text-slate-500">NOISE / HONKING</p>
                  <p className="text-base font-black text-red-600">89.2 dB</p>
                  <p className="text-[9px] text-slate-400">Honk-Free Active</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <p className="text-[9px] text-slate-500">AIR QUALITY (AQI)</p>
                  <p className="text-base font-black text-amber-600">184 AQI</p>
                  <p className="text-[9px] text-slate-400">PM2.5 Elevated</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 4: SMART PARKING RESERVATION ════ */}
        {citizenTab === 'parking' && (
          <div className="space-y-3.5 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-slate-900">Find & Reserve Parking</h2>
              <p className="text-xs text-slate-500">Live availability with instant QR entry pass</p>
            </div>

            <div className="space-y-2.5">
              {parkingLots.map(lot => (
                <div key={lot.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900">{lot.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{lot.distance} away • {lot.zone}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {lot.available} Free
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 font-mono">{lot.rate}</span>
                    <button
                      onClick={() => handleBookParking(lot)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {bookedSlot && (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 text-center space-y-2 shadow-md">
                <span className="bg-emerald-600 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase">
                  ✓ Slot Reserved
                </span>
                <p className="text-base font-black text-emerald-950">{bookedSlot.slot}</p>
                <p className="text-xs text-slate-700 font-mono">{bookedSlot.lotName}</p>
                <div className="w-20 h-20 mx-auto bg-white p-2 rounded-2xl border border-emerald-300 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-slate-900" />
                </div>
                <p className="text-[9px] text-slate-500 font-mono">Scan QR at Entry Barrier</p>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 5: BENGALURU HOTSPOTS & AI AGENTS ════ */}
        {citizenTab === 'map' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <MapIcon className="w-4 h-4 text-blue-600" />
                Bengaluru Corridor Congestion Heatmap
              </span>
              <p className="text-xs text-slate-500">Live AI congestion forecast & signal delays</p>

              <div className="space-y-2 pt-1">
                {bengaluruHotspots.map((spot, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{spot.name}</p>
                      <p className="text-[10px] text-slate-500">Avg Speed: {spot.speed} • Delay: {spot.delay}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      spot.color === 'red' ? 'bg-red-100 text-red-800' : (spot.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                    }`}>
                      {spot.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 14 AI Agents Overview */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  14 AI Agents Matrix Status
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  14/14 Online
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Model-driven accident detection, V2V safety, and consensus engine operational.</p>
            </div>
          </div>
        )}

        {/* ════ TAB 6: MY FINES & PAYMENTS ════ */}
        {citizenTab === 'fines' && (
          <div className="space-y-3.5 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                My Vehicle E-Challans & Fines
              </h2>
              <p className="text-xs text-slate-500">Instant fine payment & clearance</p>
            </div>

            <div className="space-y-2.5">
              {myFines.map((f, i) => (
                <div key={i} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-700 font-mono">{f.id}</span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {f.status}
                    </span>
                  </div>
                  <div className="text-slate-800 font-mono space-y-0.5">
                    <p>Vehicle: <strong>{f.vehicle}</strong></p>
                    <p>Violation: <strong>{f.violation}</strong></p>
                    <p>Fine Amount: <strong className="text-red-600">₹{f.amount}</strong></p>
                  </div>
                  <button
                    onClick={() => {
                      toast.success(`Payment of ₹${f.amount} processed for ${f.id}`);
                      setMyFines(prev => prev.map(item => item.id === f.id ? { ...item, status: 'PAID' } : item));
                    }}
                    disabled={f.status === 'PAID'}
                    className={`w-full py-2.5 rounded-xl font-bold transition-all text-xs ${
                      f.status === 'PAID' ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {f.status === 'PAID' ? '✓ Paid & Cleared' : 'Pay Fine Online (₹1,000)'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── MOBILE CITIZEN BOTTOM DOCK ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setCitizenTab('connected')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'connected' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Car className="w-5 h-5" />
          <span className="text-[9px]">V2V & HUD</span>
        </button>

        <button
          onClick={() => setCitizenTab('report')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'report' ? 'text-purple-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[9px]">Report</span>
        </button>

        <button
          onClick={() => setCitizenTab('pedestrian')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'pedestrian' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px]">Pedestrian</span>
        </button>

        <button
          onClick={() => setCitizenTab('parking')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'parking' ? 'text-teal-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ParkingCircle className="w-5 h-5" />
          <span className="text-[9px]">Parking</span>
        </button>

        <button
          onClick={() => setCitizenTab('map')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'map' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-[9px]">Map & AI</span>
        </button>

        <button
          onClick={() => setCitizenTab('fines')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            citizenTab === 'fines' ? 'text-amber-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[9px]">Fines</span>
        </button>
      </nav>

    </div>
  );
}
