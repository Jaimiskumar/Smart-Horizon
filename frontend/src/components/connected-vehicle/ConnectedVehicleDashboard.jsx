import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
  Camera,
  Radio,
  Wifi,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Clock,
  Wrench,
  Navigation,
  Compass,
  Play,
  RotateCw,
  Eye,
  Sliders,
  MapPin,
  Car,
  Zap,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  Truck,
  ArrowRight,
  Info,
  ChevronRight,
  TrendingDown,
  Volume2
} from 'lucide-react';
import { BANGALORE_LANDMARKS, BANGALORE_CENTER } from '../../config/bangaloreGeospatial';

export default function ConnectedVehicleDashboard() {
  // Navigation & Sub-Tab State
  const [activeView, setActiveView] = useState('dashcam-hud'); // 'dashcam-hud' | 'community-map' | 'work-orders' | 'pipeline-feed'
  
  // Selected Vehicle State
  const [selectedVehicleId, setSelectedVehicleId] = useState('ANON-VH-412');
  const [vehicles, setVehicles] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [pipelineFeed, setPipelineFeed] = useState([]);
  const [activeWarning, setActiveWarning] = useState(null);
  
  // Demo Execution State
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoType, setDemoType] = useState(null); // 'pothole' | 'accident'
  const [demoStage, setDemoStage] = useState('');
  const [demoProgress, setDemoProgress] = useState(0);

  // Dashcam Canvas Simulation State
  const canvasRef = useRef(null);
  const [cameraMode, setCameraMode] = useState('NORMAL'); // 'NORMAL' | 'AI_OVERLAY' | 'NIGHT_VISION'
  const [detectedObjects, setDetectedObjects] = useState([
    { id: 1, type: 'POTHOLE', x: 260, y: 340, w: 120, h: 70, depth_cm: 11.5, conf: 0.97, severity: 'HIGH' },
    { id: 2, type: 'PEDESTRIAN', x: 490, y: 220, w: 45, h: 110, conf: 0.94, severity: 'MEDIUM' }
  ]);
  const animationFrameRef = useRef(null);

  // Filter State for Community Map
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState(null);

  // Socket Connection
  const socketRef = useRef(null);

  // 1. Initial Data Fetch
  const fetchData = async () => {
    try {
      const [vehRes, hazRes, woRes, feedRes] = await Promise.all([
        axios.get('/api/urbanflow/connected-vehicle/vehicles'),
        axios.get('/api/urbanflow/community-cloud/hazards'),
        axios.get('/api/urbanflow/work-orders'),
        axios.get('/api/urbanflow/connected-vehicle/feed')
      ]);

      if (vehRes.data?.vehicles) setVehicles(vehRes.data.vehicles);
      if (hazRes.data?.hazards) {
        setHazards(hazRes.data.hazards);
        if (!selectedHazard && hazRes.data.hazards.length > 0) {
          setSelectedHazard(hazRes.data.hazards[0]);
        }
      }
      if (woRes.data?.workOrders) setWorkOrders(woRes.data.workOrders);
      if (feedRes.data?.feed) setPipelineFeed(feedRes.data.feed);
    } catch (e) {
      console.warn('Connected Vehicle data load warning:', e.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Real-time Socket.IO Listeners
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('v2v_proximity_warning', (data) => {
      if (data.warning) {
        setActiveWarning(data.warning);
        toast(
          (t) => (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 animate-bounce" />
              <div>
                <p className="font-bold text-amber-900 text-sm">V2V PROXIMITY ALERT</p>
                <p className="text-xs text-gray-800 font-medium">{data.warning.warning_text}</p>
                <p className="text-[10px] text-gray-500 mt-1">Vehicle: {data.vehicle_id} • Status: {data.warning.status}</p>
              </div>
            </div>
          ),
          { duration: 8000, style: { background: '#fffbeb', border: '1px solid #f59e0b' } }
        );
      }
      fetchData();
    });

    socket.on('hazard_reported', (data) => {
      fetchData();
    });

    socket.on('hazard_verified', (data) => {
      toast.success(`🎉 Hazard Verified by Community! (${data.verification_count} Reports)`, {
        icon: '🛡️'
      });
      fetchData();
    });

    socket.on('urbanflow-workorder-dispatched', (data) => {
      toast(
        (t) => (
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-indigo-900 text-sm">BBMP Work Order Generated</p>
              <p className="text-xs text-gray-700">{data.work_order?.hazard_title}</p>
              <p className="text-[10px] text-indigo-600 font-mono mt-0.5">{data.work_order?.work_order_id} • {data.work_order?.crew}</p>
            </div>
          </div>
        ),
        { duration: 7000, style: { background: '#eef2ff', border: '1px solid #6366f1' } }
      );
      fetchData();
    });

    socket.on('demo_stage_update', (data) => {
      setDemoStage(data.stage);
      setDemoProgress(data.progress || 0);
      if (data.progress >= 100) {
        setTimeout(() => setIsDemoRunning(false), 1200);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Simulated Canvas Dashcam Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let offset = 0;

    const render = () => {
      offset = (offset + 3) % 40;
      const width = canvas.width;
      const height = canvas.height;

      // Sky & Environment
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.45);

      // Distant Bengaluru Skyline & Flyover Pillars
      ctx.fillStyle = '#090d16';
      for (let i = 0; i < width; i += 60) {
        const h = 40 + Math.sin(i * 0.05) * 25;
        ctx.fillRect(i, height * 0.45 - h, 45, h);
      }

      // Asphalt Road
      const roadGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);

      // Road Perspective Lines (Vanishing point: width/2, height*0.45)
      const vpX = width / 2;
      const vpY = height * 0.45;

      // Road Edges
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(vpX - 40, vpY);
      ctx.lineTo(20, height);
      ctx.moveTo(vpX + 40, vpY);
      ctx.lineTo(width - 20, height);
      ctx.stroke();

      // Dashed Lane Markings with motion
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Simulated Lead Vehicle ahead
      const leadX = width / 2 - 35;
      const leadY = height * 0.52;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(leadX, leadY, 70, 40); // car body
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(leadX + 10, leadY + 8, 50, 16); // rear window
      // Tail lights
      ctx.fillStyle = '#f87171';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillRect(leadX + 4, leadY + 22, 12, 8);
      ctx.fillRect(leadX + 54, leadY + 22, 12, 8);
      ctx.shadowBlur = 0; // reset

      // AI Bounding Box Overlays
      if (cameraMode !== 'NORMAL') {
        // Grid scanlines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Draw Detected Pothole Bounding Box
      const potX = width * 0.32;
      const potY = height * 0.72;
      const potW = 140;
      const potH = 50;

      // Pothole Texture on Road
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.ellipse(potX + potW / 2, potY + potH / 2, potW / 2, potH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // AI Bounding Box Box & Label
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(potX - 8, potY - 8, potW + 16, potH + 16);

      // AI Tag Pill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(potX - 8, potY - 32, 156, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('🕳️ POTHOLE (11.5cm) 97%', potX - 4, potY - 17);

      // Draw Pedestrian Crosswalk Box
      const pedX = width * 0.75;
      const pedY = height * 0.48;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(pedX, pedY, 38, 85);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.fillRect(pedX, pedY - 22, 120, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('🚶 PEDESTRIAN 94%', pedX + 4, pedY - 8);

      // Dashcam HUD Metadata Overlay (Top Left & Top Right)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(12, 12, 280, 52);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(12, 12, 280, 52);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('● REC 1080P 60FPS • AI INFERENCE: 14ms', 22, 30);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.fillText(`GPS: 12.9178° N, 77.6239° E | SPD: 48 km/h`, 22, 45);
      ctx.fillText(`ANON ID: ${selectedVehicleId} | DSRC: LOCKED`, 22, 58);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraMode, selectedVehicleId]);

  // 4. One-Click Demo Triggers
  const triggerPotholeDemo = async () => {
    setIsDemoRunning(true);
    setDemoType('pothole');
    setDemoProgress(5);
    setDemoStage('INITIALIZING_DASHCAM_PIPELINE');
    try {
      const res = await axios.post('/api/urbanflow/connected-vehicle/demo/pothole');
      toast.success('Connected Vehicle Pothole Flow Complete!');
      fetchData();
    } catch (e) {
      toast.error('Pothole demo error: ' + e.message);
      setIsDemoRunning(false);
    }
  };

  const triggerAccidentDemo = async () => {
    setIsDemoRunning(true);
    setDemoType('accident');
    setDemoProgress(5);
    setDemoStage('INITIALIZING_ACCIDENT_RADAR');
    try {
      const res = await axios.post('/api/urbanflow/connected-vehicle/demo/accident');
      toast.success('Accident & V2V Secondary Crash Flow Complete!');
      fetchData();
    } catch (e) {
      toast.error('Accident demo error: ' + e.message);
      setIsDemoRunning(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || {
    id: 'ANON-VH-412',
    speed: 48,
    heading: 175,
    road: 'Hosur Road / Silk Board Corridor',
    zone: 'Silk Board Junction',
    comm_mode: 'DSRC + C-V2V'
  };

  const filteredHazards = hazards.filter((h) => {
    if (filterCategory !== 'ALL' && h.category !== filterCategory) return false;
    if (verifiedOnly && h.status !== 'COMMUNITY_VERIFIED') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Connected Vehicle C-V2X / DSRC Road Safety Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Connected Vehicle Road Safety Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Front dashcam AI hazard detection, shared Community Road Safety Cloud, real-time V2V proximity alerts, and automated BBMP infrastructure work order dispatch.
            </p>
          </div>

          {/* Quick Demo Launch Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={triggerPotholeDemo}
              disabled={isDemoRunning}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              1-Click Pothole Demo
            </button>
            <button
              onClick={triggerAccidentDemo}
              disabled={isDemoRunning}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              1-Click Accident + V2V Demo
            </button>
          </div>
        </div>

        {/* Demo Stage Progress Bar if running */}
        {isDemoRunning && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-amber-300 flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Executing {demoType === 'pothole' ? 'Connected Vehicle Pothole Flow' : 'Accident Secondary Collision Flow'}...
              </span>
              <span className="font-mono text-white">{demoProgress}%</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${demoProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300 font-mono mt-1.5">{demoStage}</p>
          </div>
        )}
      </div>

      {/* Proximity Warning Banner if active */}
      {activeWarning && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border-2 border-amber-500/50 rounded-2xl flex items-center justify-between gap-4 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black uppercase">
                  INCOMING V2V WARNING
                </span>
                <span className="text-xs font-bold text-amber-800">
                  {activeWarning.category} • {activeWarning.distance_m}m Ahead
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {activeWarning.warning_text}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveWarning(null)}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-bold rounded-lg transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveView('dashcam-hud')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'dashcam-hud'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4" />
          Dashcam AI HUD & OBU
        </button>
        <button
          onClick={() => setActiveView('community-map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'community-map'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Community Safety Map ({hazards.length})
        </button>
        <button
          onClick={() => setActiveView('work-orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'work-orders'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          BBMP Work Orders ({workOrders.length})
        </button>
        <button
          onClick={() => setActiveView('pipeline-feed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'pipeline-feed'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          6-Stage Live Event Feed
        </button>
      </div>

      {/* VIEW 1: DASHCAM AI HUD & OBU VIEW */}
      {activeView === 'dashcam-hud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dashcam Screen */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                    Live Front-Facing Dashcam Stream
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-mono">
                    EDGE_AI: YOLOv5+DepthNet
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCameraMode(cameraMode === 'NORMAL' ? 'AI_OVERLAY' : 'NORMAL')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                      cameraMode === 'AI_OVERLAY'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    AI Overlay: {cameraMode === 'AI_OVERLAY' ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Dashcam Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Bottom Dashcam Controls & Detection Stats */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400">Pothole Depth</p>
                  <p className="text-sm font-extrabold text-amber-400 font-mono">11.5 cm</p>
                  <p className="text-[9px] text-slate-500">Surface IRI: 7.2</p>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400">AI Confidence</p>
                  <p className="text-sm font-extrabold text-emerald-400 font-mono">97.4%</p>
                  <p className="text-[9px] text-slate-500">pot-v1 Model</p>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400">Vibration Spike</p>
                  <p className="text-sm font-extrabold text-indigo-400 font-mono">2.3 g</p>
                  <p className="text-[9px] text-slate-500">3-Axis IMU</p>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400">Cloud Sync</p>
                  <p className="text-sm font-extrabold text-blue-400 font-mono">PUBLISHED</p>
                  <p className="text-[9px] text-slate-500">Latency: 12ms</p>
                </div>
              </div>
            </div>

            {/* 6-Stage Telemetry Sequence Visualizer */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Live 6-Stage Telemetry Pipeline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-[11px] font-bold text-slate-800">Dashcam</p>
                  <p className="text-[9px] text-slate-500">1080p Stream</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</div>
                  <p className="text-[11px] font-bold text-slate-800">AI Detect</p>
                  <p className="text-[9px] text-slate-500">YOLO + Depth</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">3</div>
                  <p className="text-[11px] font-bold text-slate-800">Cloud Sync</p>
                  <p className="text-[9px] text-slate-500">GPS & Timestamp</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">4</div>
                  <p className="text-[11px] font-bold text-emerald-900">Verified</p>
                  <p className="text-[9px] text-emerald-700">2+ Vehicles</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">5</div>
                  <p className="text-[11px] font-bold text-amber-900">V2V Alert</p>
                  <p className="text-[9px] text-amber-700">Same Route</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">6</div>
                  <p className="text-[11px] font-bold text-blue-900">Decision</p>
                  <p className="text-[9px] text-blue-700">Work Order</p>
                </div>
              </div>
            </div>
          </div>

          {/* OBU Vehicle Telemetry Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">OBU Telemetry Unit</h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                  DSRC ACTIVE
                </span>
              </div>

              {/* Vehicle Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Active Connected Vehicle
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} • {v.type} ({v.zone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Telemetry Gauges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium">Speed</p>
                  <p className="text-lg font-black text-slate-900 font-mono">
                    {selectedVehicle.speed} <span className="text-xs font-normal text-slate-500">km/h</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium">Heading</p>
                  <p className="text-lg font-black text-slate-900 font-mono">
                    {selectedVehicle.heading}° <span className="text-xs font-normal text-slate-500">S</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium">Corridor</p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedVehicle.zone}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium">Comm Protocol</p>
                  <p className="text-xs font-bold text-indigo-600 font-mono">
                    {selectedVehicle.comm_mode}
                  </p>
                </div>
              </div>

              {/* Hardware-Ready Architecture Note */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-800">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  Hardware-Ready Architecture
                </p>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  Conforms to SAE J2735 / IEEE 802.11p DSRC message sets. Telemetry is streamed over REST + WebSockets, ready for real OBU / GPS / dashcam camera attachment.
                </p>
              </div>
            </div>

            {/* Quick Community Hazard Stats */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Community Cloud Status</span>
                <span className="text-emerald-600 font-mono text-[10px] font-bold">LIVE SYNC</span>
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Verified Hazards</span>
                  <span className="font-black text-emerald-600">
                    {hazards.filter((h) => h.status === 'COMMUNITY_VERIFIED').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Work Orders Dispatched</span>
                  <span className="font-black text-indigo-600">{workOrders.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Active Connected OBUs</span>
                  <span className="font-black text-blue-600">{vehicles.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: COMMUNITY SAFETY MAP */}
      {activeView === 'community-map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Bengaluru Community Road Hazards Map
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pins represent dashcam-reported potholes, accidents, and blockages with community verification status.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="POTHOLE">Potholes</option>
                    <option value="ACCIDENT">Accidents</option>
                    <option value="ROAD_BLOCKAGE">Blockages</option>
                    <option value="PEDESTRIAN_HAZARD">Pedestrian Hazards</option>
                  </select>
                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      verifiedOnly
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Verified Only
                  </button>
                </div>
              </div>

              {/* Map Canvas / Grid Representation */}
              <div className="relative aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 p-6 flex flex-col justify-between">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Bengaluru Zones Grid Pins */}
                <div className="relative z-10 grid grid-cols-3 gap-4 h-full">
                  {BANGALORE_LANDMARKS.slice(0, 6).map((landmark, idx) => {
                    const landmarkHazards = hazards.filter((h) => h.zone_name.includes(landmark.name.split(' ')[0]));
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl flex flex-col justify-between hover:border-indigo-500 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-bold text-slate-200">{landmark.name}</p>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {landmark.lat.toFixed(4)}°N, {landmark.lng.toFixed(4)}°E
                        </p>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Hazards:</span>
                          <span className="font-bold text-amber-400">{landmarkHazards.length} Active</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Map Overlay Badge */}
                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>📍 City Center: Bengaluru (12.9716° N, 77.5946° E)</span>
                  <span className="text-indigo-400 font-bold">Showing {filteredHazards.length} Community Hazards</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hazard Details List */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Community Hazard Reports</span>
                <span className="text-xs text-indigo-600 font-bold">{filteredHazards.length} Total</span>
              </h3>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredHazards.map((h) => (
                  <div
                    key={h.hazard_id}
                    onClick={() => setSelectedHazard(h)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      selectedHazard?.hazard_id === h.hazard_id
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mb-1 ${
                            h.status === 'COMMUNITY_VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {h.status === 'COMMUNITY_VERIFIED' ? `✓ VERIFIED (${h.verification_count})` : 'REPORTED (1)'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{h.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{h.road}</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-indigo-600 font-mono">
                        {h.speed_advisory_kmh} km/h
                      </span>
                    </div>

                    {h.work_order_id && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-indigo-700 font-semibold">
                        <span>Work Order: {h.work_order_id}</span>
                        <span className="text-emerald-700">Crew Dispatched</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: BBMP INFRASTRUCTURE WORK ORDERS */}
      {activeView === 'work-orders' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  BBMP Infrastructure Maintenance Work Orders
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automated work orders generated by the Infrastructure Agent when potholes or road defects receive verified community reports.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl">
              {workOrders.length} Total Dispatched
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workOrders.map((wo) => (
              <div
                key={wo.work_order_id}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-mono font-bold">
                    {wo.work_order_id}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                    {wo.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{wo.hazard_title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {wo.road}
                  </p>
                </div>

                <div className="space-y-1 pt-2 border-t border-indigo-100/60 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Assigned Taskforce:</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[160px]">
                      {wo.crew}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Severity / Priority:</span>
                    <span className="font-bold text-amber-600">{wo.severity}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Est. Repair Window:</span>
                    <span className="font-bold text-slate-800">{wo.estimated_repair_time}</span>
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-indigo-100 text-[10px] text-slate-500 font-mono">
                  Coordinates: {wo.lat?.toFixed(4)}° N, {wo.lng?.toFixed(4)}° E
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: 6-STAGE LIVE EVENT PIPELINE FEED */}
      {activeView === 'pipeline-feed' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Live 6-Stage Event Pipeline Feed
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time chronological events across Dashcam AI, Cloud Ingestion, Verification, V2V Alerts, and UrbanFlow Decisions.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {pipelineFeed.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold rounded">
                      {entry.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{entry.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
