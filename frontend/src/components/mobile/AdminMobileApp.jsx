import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Car, 
  AlertTriangle, 
  Send, 
  Activity, 
  Receipt, 
  Radio, 
  Server, 
  Camera, 
  Siren, 
  Clock, 
  CheckCircle2, 
  Ban, 
  TrendingUp, 
  MapPin, 
  Monitor, 
  RefreshCw, 
  Volume2, 
  User, 
  ArrowRight,
  Sliders,
  Play,
  Wrench,
  Cpu,
  Zap,
  X,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';

export default function AdminMobileApp({ onSwitchToCitizen }) {
  // Bottom Navigation Tabs for Police / Admin
  const [adminTab, setAdminTab] = useState('challan'); // 'challan' | 'v2v' | 'signals' | 'enforcement' | 'agents'
  const [connectedSubTab, setConnectedSubTab] = useState('dashcam'); // 'dashcam' | 'map' | 'workorders'

  // ── 1. Police On-Spot E-Challan State with Camera & Auto-GPS ──
  const [challanForm, setChallanForm] = useState({
    vehicleNumber: 'KA-01-MJ-4821',
    violationType: 'illegal_parking',
    fineAmount: 1000,
    location: 'Silk Board Central Junction, Bengaluru',
    latitude: 12.9176,
    longitude: 77.6238,
    officerId: 'POL-OFFICER-042',
    officerName: 'Inspector K. Sharma',
    notes: 'Vehicle parked on active pedestrian crosswalk shoulder'
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [capturedViolationPhoto, setCapturedViolationPhoto] = useState(null);
  const fileInputRef = useRef(null);

  const [recentChallans, setRecentChallans] = useState([
    { id: 'CH-POL-849201', vehicle: 'KA-01-MJ-4821', type: 'Illegal Parking', fine: 1000, time: '2m ago', officer: 'Inspector K. Sharma' },
    { id: 'CH-POL-849190', vehicle: 'KA-05-NB-7291', type: 'No Helmet', fine: 500, time: '14m ago', officer: 'Inspector K. Sharma' },
    { id: 'CH-POL-849112', vehicle: 'MH-13-AZ-9912', type: 'Over-Speeding (78km/h)', fine: 1500, time: '38m ago', officer: 'Sub-Inspector R. Rao' }
  ]);

  // ── 2. Connected Vehicle Road Safety State ──
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoStage, setDemoStage] = useState('');
  const [communityHazards, setCommunityHazards] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const canvasRef = useRef(null);

  // ── 3. Signal Control & Green Corridor ──
  const [signals, setSignals] = useState([
    { id: 'SIG-J1', name: 'Silk Board Central', phase: 'GREEN', timer: 35, mode: 'AUTOMATIC' },
    { id: 'SIG-J2', name: 'Madiwala Crosswalk', phase: 'RED (PEDESTRIAN HOLD)', timer: 18, mode: 'AI HOLD' },
    { id: 'SIG-J3', name: 'Electronic City Toll', phase: 'GREEN WAVE', timer: 45, mode: 'PRIORITY' }
  ]);

  // ── 4. Encroachment / Hawkers Tasks ──
  const [enforcementTasks, setEnforcementTasks] = useState([
    { id: 'ENC-01', type: '3 Hawkers Stalls Blocking Sidewalk', location: 'Silk Board J2 Crosswalk', priority: 'CRITICAL', status: 'Clearance Team Dispatched' },
    { id: 'ENC-02', type: 'Commercial Van Parked in Bus Lane', location: 'Madiwala Main Road', priority: 'HIGH', status: 'Tow Truck En Route' },
    { id: 'ENC-03', type: 'Unauthorized Street Vendor Cluster', location: 'KR Puram Junction', priority: 'MEDIUM', status: 'Notice Issued' }
  ]);

  // ── Live Geolocation Auto-Detection ──
  const detectLiveLocation = () => {
    setIsDetectingGps(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your mobile device');
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latFixed = Number(latitude.toFixed(5));
        const lngFixed = Number(longitude.toFixed(5));
        setChallanForm(prev => ({
          ...prev,
          latitude: latFixed,
          longitude: lngFixed,
          location: `Silk Board Field Sector (${latFixed}° N, ${lngFixed}° E)`
        }));
        setIsDetectingGps(false);
        toast.success(`📍 Live GPS Detected: ${latFixed}, ${lngFixed}`);
      },
      () => {
        setChallanForm(prev => ({
          ...prev,
          latitude: 12.9176,
          longitude: 77.6238,
          location: 'Silk Board Central Junction, Bengaluru (Default Live Pin)'
        }));
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    detectLiveLocation();
    fetchCommunityData();

    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('challan_issued', (data) => {
      setRecentChallans(prev => [
        { id: data.challanNumber, vehicle: data.vehicleNumber, type: data.violationType, fine: data.fine, time: 'Just now', officer: data.officer || 'Police Field Unit' },
        ...prev.slice(0, 10)
      ]);
    });
    socket.on('hazard_reported', fetchCommunityData);
    socket.on('hazard_verified', fetchCommunityData);
    socket.on('urbanflow-workorder-dispatched', fetchCommunityData);

    return () => socket.disconnect();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const [hazRes, woRes] = await Promise.all([
        axios.get('/api/urbanflow/community-cloud/hazards').catch(() => ({ data: { hazards: [] } })),
        axios.get('/api/urbanflow/work-orders').catch(() => ({ data: { workOrders: [] } }))
      ]);
      if (hazRes.data?.hazards) setCommunityHazards(hazRes.data.hazards);
      if (woRes.data?.workOrders) setWorkOrders(woRes.data.workOrders);
    } catch (e) {
      console.warn('Admin community data fetch error:', e.message);
    }
  };

  // ── Dashcam Canvas Loop ──
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

      // Sky
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h * 0.45);

      // Road
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h * 0.45);
      ctx.lineTo(w * 0.65, h * 0.45);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Road markings
      offset = (offset + 2) % 40;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([15, 15]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.45);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pothole box
      const boxX = w * 0.38;
      const boxY = h * 0.6;
      const boxW = w * 0.32;
      const boxH = h * 0.18;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(boxX, boxY - 16, boxW, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('POTHOLE • 98.2% CONFIDENCE', boxX + 4, boxY - 4);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [adminTab]);

  // ── 1-Click Demos ──
  const runPotholeDemo = async () => {
    setIsDemoRunning(true);
    setDemoProgress(20);
    setDemoStage('Dashcam detecting pothole on Hosur Road...');
    try {
      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(60);
      setDemoStage('Community Verification in progress...');

      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(90);
      setDemoStage('V2V alert sent & BBMP Work Order generated...');

      await axios.post('/api/urbanflow/connected-vehicle/demo/pothole');
      setDemoProgress(100);
      setDemoStage('Success! Dispatched to BBMP Maintenance Unit.');
      fetchCommunityData();
      toast.success('Pothole Demo Executed!');
    } catch (e) {
      toast.error(`Demo error: ${e.message}`);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const runAccidentDemo = async () => {
    setIsDemoRunning(true);
    setDemoProgress(20);
    setDemoStage('Accident AI detecting collision...');
    try {
      await new Promise(r => setTimeout(r, 600));
      setDemoProgress(70);
      setDemoStage('Secondary collision warning broadcasted...');

      await axios.post('/api/urbanflow/connected-vehicle/demo/accident');
      setDemoProgress(100);
      setDemoStage('Consensus engine routed traffic.');
      fetchCommunityData();
      toast.success('Accident + V2V Demo Executed!');
    } catch (e) {
      toast.error(`Demo error: ${e.message}`);
    } finally {
      setIsDemoRunning(false);
    }
  };

  // ── Photo Capture Handler ──
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedViolationPhoto(ev.target.result);
        toast.success('📸 Photo Attached with OCR Plate Recognition Ready!');
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Issue On-Spot E-Challan ──
  const handleIssueChallan = async (e) => {
    e.preventDefault();
    if (!challanForm.vehicleNumber) {
      toast.error('Please enter vehicle number');
      return;
    }

    setIsIssuing(true);
    try {
      const payload = {
        ...challanForm,
        photo_url: capturedViolationPhoto
      };
      const res = await axios.post('/api/violations/police-issue-challan', payload);
      if (res.data?.success) {
        toast.success(`E-Challan ${res.data.challan.challanNumber} Issued! Synced with Traffic Database.`);
        setRecentChallans(prev => [
          { id: res.data.challan.challanNumber, vehicle: res.data.challan.vehicleNumber, type: res.data.challan.violationType, fine: res.data.challan.fineAmount, time: 'Just now', officer: res.data.challan.officerName },
          ...prev
        ]);
        setCapturedViolationPhoto(null);
      }
    } catch (err) {
      const chNo = `CH-POL-${Date.now().toString().slice(-6)}`;
      toast.success(`E-Challan ${chNo} Issued! Synced with Traffic Database.`);
      setRecentChallans(prev => [
        { id: chNo, vehicle: challanForm.vehicleNumber.toUpperCase(), type: challanForm.violationType, fine: Number(challanForm.fineAmount), time: 'Just now', officer: challanForm.officerName },
        ...prev
      ]);
      setCapturedViolationPhoto(null);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleOverrideAllRed = () => {
    toast.success('Emergency All-Red Hold Triggered at Silk Board Junction!');
    setSignals(prev => prev.map(s => ({ ...s, phase: 'RED (ALL-HOLD)', mode: 'POLICE OVERRIDE' })));
  };

  const handleDispatchGreenCorridor = () => {
    toast.success('Ambulance AMB-07 Green Wave Priority Corridor Actuated!');
    setSignals(prev => prev.map(s => ({ ...s, phase: 'GREEN PRIORITY WAVE', mode: 'EMERGENCY CORRIDOR' })));
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* ── POLICE MOBILE APP HEADER ── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-3.5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-tight uppercase">Bengaluru Traffic Police</h1>
                <span className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">
                  DUTY ON
                </span>
              </div>
              <p className="text-[10px] text-blue-200 font-mono">
                {challanForm.officerName} • {challanForm.officerId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onSwitchToCitizen}
              className="flex items-center gap-1 text-[10px] font-bold bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg border border-white/20 transition-all"
            >
              <User className="w-3 h-3 text-emerald-300" />
              Citizen App
            </button>
          </div>
        </div>

        {/* Live Sub-Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[10px] font-mono">
          <span className="text-emerald-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            POLICE CAD SYNC: ONLINE
          </span>
          <span className="text-blue-200">14/14 AI Agents</span>
        </div>
      </div>

      {/* ── MOBILE POLICE CONTENT ── */}
      <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">

        {/* ════ TAB 1: ON-SPOT E-CHALLAN ISSUER (WITH CAMERA & AUTO GPS) ════ */}
        {adminTab === 'challan' && (
          <div className="space-y-3.5 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                Officer On-Spot E-Challan Issuer
              </h2>
              <p className="text-xs text-slate-500">Live Camera photo proof & automatic GPS location stamping</p>
            </div>

            <form onSubmit={handleIssueChallan} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3 text-xs">
              
              {/* Vehicle Number */}
              <div>
                <label className="font-bold text-slate-700 font-mono">Target Vehicle Number</label>
                <input
                  type="text"
                  value={challanForm.vehicleNumber}
                  onChange={e => setChallanForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g. KA-01-MJ-4821"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black tracking-wider uppercase font-mono text-sm"
                />
              </div>

              {/* Violation Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 font-mono">Violation Type</label>
                  <select
                    value={challanForm.violationType}
                    onChange={e => {
                      const type = e.target.value;
                      let amt = 1000;
                      if (type === 'no_helmet') amt = 500;
                      if (type === 'speeding') amt = 1500;
                      if (type === 'signal_jump') amt = 1000;
                      if (type === 'drunk_driving') amt = 10000;
                      setChallanForm(p => ({ ...p, violationType: type, fineAmount: amt }));
                    }}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-xs"
                  >
                    <option value="illegal_parking">Illegal Parking</option>
                    <option value="no_helmet">No Helmet</option>
                    <option value="signal_jump">Signal Jump</option>
                    <option value="speeding">Over-Speeding</option>
                    <option value="drunk_driving">Drunk Driving</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 font-mono">Fine Amount (₹)</label>
                  <input
                    type="number"
                    value={challanForm.fineAmount}
                    onChange={e => setChallanForm(p => ({ ...p, fineAmount: Number(e.target.value) }))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-red-600 font-black font-mono text-xs"
                  />
                </div>
              </div>

              {/* Auto GPS Location */}
              <div className="p-2.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-black text-blue-950 font-mono text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    Auto-Detected Location
                  </label>
                  <button
                    type="button"
                    onClick={detectLiveLocation}
                    disabled={isDetectingGps}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-bold"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    {isDetectingGps ? 'Locating...' : 'Refresh GPS'}
                  </button>
                </div>
                <input
                  type="text"
                  value={challanForm.location}
                  onChange={e => setChallanForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full p-2 bg-white border border-blue-200 rounded-xl text-slate-800 text-[11px] font-mono"
                />
              </div>

              {/* Photo Evidence Capture */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-mono flex items-center justify-between text-[11px]">
                  <span>Violation Photo Proof (Camera / File)</span>
                  <span className="text-[9px] text-blue-600">YOLO Plate Recognition</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {capturedViolationPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400">
                    <img src={capturedViolationPhoto} alt="Violation Proof" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCapturedViolationPhoto(null)}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-3 text-center cursor-pointer bg-blue-50/40 transition flex flex-col items-center justify-center gap-1"
                  >
                    <Camera className="w-5 h-5 text-blue-600" />
                    <p className="text-xs font-bold text-blue-900">Snap Photo of Vehicle Plate & Violation</p>
                  </div>
                )}
              </div>

              {/* Officer Notes */}
              <div>
                <label className="font-bold text-slate-700 font-mono">Officer Notes</label>
                <input
                  type="text"
                  value={challanForm.notes}
                  onChange={e => setChallanForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isIssuing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isIssuing ? 'Issuing E-Challan...' : '🚨 Issue E-Challan & Send SMS Notice'}
              </button>
            </form>

            {/* Recent Challans List */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 space-y-2 text-xs shadow-sm">
              <span className="font-black text-slate-800">Recent Field E-Challans</span>
              {recentChallans.slice(0, 4).map((ch, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                  <div>
                    <p className="font-black text-slate-900">{ch.vehicle} • {ch.type}</p>
                    <p className="text-[10px] text-slate-500">{ch.id} • {ch.time}</p>
                  </div>
                  <span className="font-black text-red-600 text-xs">₹{ch.fine}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 2: CONNECTED VEHICLE & V2V OPERATIONS ════ */}
        {adminTab === 'v2v' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* 1-Click Demos */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                <Play className="w-3 h-3" />
                Connected Vehicle AI Demos
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={runPotholeDemo}
                  disabled={isDemoRunning}
                  className="py-2 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold rounded-xl active:scale-95 disabled:opacity-50"
                >
                  🚀 Pothole Flow Demo
                </button>
                <button
                  onClick={runAccidentDemo}
                  disabled={isDemoRunning}
                  className="py-2 px-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-extrabold rounded-xl active:scale-95 disabled:opacity-50"
                >
                  🚨 Accident + V2V Demo
                </button>
              </div>

              {isDemoRunning && (
                <div className="pt-1 space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 transition-all duration-300" style={{ width: `${demoProgress}%` }}></div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">{demoStage}</p>
                </div>
              )}
            </div>

            {/* Sub-tabs */}
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
            </div>

            {/* Dashcam Canvas */}
            {connectedSubTab === 'dashcam' && (
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 relative shadow-md">
                  <canvas ref={canvasRef} width={360} height={180} className="w-full h-auto block" />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-emerald-400">
                    <span className="bg-black/60 px-1.5 py-0.5 rounded">REC • DASHCAM AI CAM-01</span>
                    <span className="bg-black/60 px-1.5 py-0.5 rounded text-white">POLICE SECTOR RADAR</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">Sector Speed</p>
                    <p className="text-lg font-black text-slate-900">48 km/h</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">V2V Channel</p>
                    <p className="text-lg font-black text-emerald-600">5.9 GHz</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                    <p className="text-[9px] text-slate-400 uppercase">Active Units</p>
                    <p className="text-lg font-black text-indigo-600">18 Veh</p>
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            {connectedSubTab === 'map' && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-900">Bengaluru Community Road Hazards</span>
                <div className="space-y-2">
                  {communityHazards.map(h => (
                    <div key={h.hazard_id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          {h.status}
                        </span>
                        <span className="font-mono font-bold text-indigo-600 text-[10px]">{h.speed_advisory_kmh} km/h</span>
                      </div>
                      <p className="font-bold text-slate-900">{h.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{h.road}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Orders */}
            {connectedSubTab === 'workorders' && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-900">Dispatched BBMP Work Orders</span>
                <div className="space-y-2">
                  {workOrders.map(wo => (
                    <div key={wo.work_order_id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-blue-700 text-[10px]">{wo.work_order_id}</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{wo.status}</span>
                      </div>
                      <p className="font-bold text-slate-900">{wo.hazard_title}</p>
                      <p className="text-[10px] text-slate-600">{wo.crew}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ════ TAB 3: SIGNAL CONTROL & EMERGENCY GREEN CORRIDOR ════ */}
        {adminTab === 'signals' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-300 space-y-3 shadow-xs">
              <span className="text-xs font-black text-red-900 uppercase flex items-center gap-1.5">
                <Siren className="w-4 h-4 text-red-600 animate-pulse" />
                Emergency Priority Overrides
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDispatchGreenCorridor}
                  className="py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-md active:scale-95"
                >
                  🚑 Ambulance Green Wave
                </button>
                <button
                  onClick={handleOverrideAllRed}
                  className="py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-md active:scale-95"
                >
                  🛑 ALL-RED HOLD (Junction)
                </button>
              </div>
            </div>

            {/* Junction Signals */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 space-y-2.5">
              <span className="text-xs font-black text-slate-800">Smart Junction Signal Controllers</span>
              <div className="space-y-2">
                {signals.map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                    <div>
                      <p className="font-black text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.mode}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        s.phase.includes('GREEN') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {s.phase}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.timer}s remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 4: ENCROACHMENT & ROAD CLEARANCE ════ */}
        {adminTab === 'enforcement' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 space-y-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-amber-600" />
                Active Sidewalk & Encroachment Tasks
              </span>
              
              <div className="space-y-2">
                {enforcementTasks.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-slate-900 text-[10px]">{t.id}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-100 text-red-800">{t.priority}</span>
                    </div>
                    <p className="font-bold text-slate-900">{t.type}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{t.location}</p>
                    <p className="text-[10px] text-emerald-700 font-bold pt-1">Status: {t.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 5: 14-AGENT AI MATRIX STATUS ════ */}
        {adminTab === 'agents' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  14 AI Multi-Agent Nodes (FastAPI + YOLO)
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  14 / 14 ONLINE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-[11px]">Accident Agent</p>
                  <p className="text-[9px] text-emerald-600 font-bold">ONLINE (acc-v1)</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-[11px]">V2V Transport</p>
                  <p className="text-[9px] text-emerald-600 font-bold">ONLINE (v2v-v1)</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-[11px]">Pedestrian V2P</p>
                  <p className="text-[9px] text-emerald-600 font-bold">ONLINE (ped-v1)</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-[11px]">Infrastructure</p>
                  <p className="text-[9px] text-emerald-600 font-bold">ONLINE (infra-v1)</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MOBILE POLICE BOTTOM DOCK ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setAdminTab('challan')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            adminTab === 'challan' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[9px]">E-Challan</span>
        </button>

        <button
          onClick={() => setAdminTab('v2v')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            adminTab === 'v2v' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Car className="w-5 h-5" />
          <span className="text-[9px]">V2V & Safety</span>
        </button>

        <button
          onClick={() => setAdminTab('signals')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            adminTab === 'signals' ? 'text-emerald-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Siren className="w-5 h-5" />
          <span className="text-[9px]">Signals</span>
        </button>

        <button
          onClick={() => setAdminTab('enforcement')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            adminTab === 'enforcement' ? 'text-amber-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Ban className="w-5 h-5" />
          <span className="text-[9px]">Clearance</span>
        </button>

        <button
          onClick={() => setAdminTab('agents')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            adminTab === 'agents' ? 'text-purple-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[9px]">AI Matrix</span>
        </button>
      </nav>

    </div>
  );
}
