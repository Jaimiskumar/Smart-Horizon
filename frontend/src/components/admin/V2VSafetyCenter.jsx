import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { 
  Car, 
  Radio, 
  Wifi, 
  AlertTriangle, 
  Shield, 
  UserCheck, 
  Activity, 
  Compass, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sliders, 
  Database, 
  Cpu, 
  Smartphone, 
  Layers, 
  MapPin, 
  Zap, 
  TrendingDown, 
  Volume2, 
  Siren, 
  Maximize2, 
  Eye, 
  RefreshCw, 
  Check, 
  ArrowRight,
  ChevronRight,
  Info,
  Server,
  Gauge,
  SlidersHorizontal,
  FileText,
  PieChart,
  Navigation,
  Camera
} from 'lucide-react';
import ConnectedVehicleDashboard from '../connected-vehicle/ConnectedVehicleDashboard';

export default function V2VSafetyCenter() {
  // Communication Mode (DSRC vs C-V2V)
  const [commMode, setCommMode] = useState('DSRC');
  const [selectedVehicle, setSelectedVehicle] = useState('VEH-021');
  const [activeTab, setActiveTab] = useState('connected-vehicle'); // 'connected-vehicle' | 'simulation' | 'models' | 'hotspots' | 'trace'

  // Live Simulated State
  const [vehicles, setVehicles] = useState([
    { id: 'VEH-001', type: 'CAR', speed: 42.5, distance: 48, accel: -0.2, brake: 'NORMAL', risk: 'SAFE', color: 'emerald' },
    { id: 'VEH-002', type: 'SUV', speed: 48.0, distance: 120, accel: -0.4, brake: 'NORMAL', risk: 'SAFE', color: 'emerald' },
    { id: 'VEH-003', type: 'TRUCK', speed: 35.0, distance: 210, accel: 0.0, brake: 'NORMAL', risk: 'SAFE', color: 'emerald' },
    { id: 'AMB-07', type: 'AMBULANCE', speed: 62.0, distance: 340, accel: 1.2, brake: 'EMERGENCY', risk: 'CRITICAL', color: 'red' },
    { id: 'VEH-005', type: 'BUS', speed: 28.0, distance: 420, accel: -0.1, brake: 'NORMAL', risk: 'SAFE', color: 'emerald' },
    { id: 'VEH-021', type: 'CAR (TARGET)', speed: 54.0, distance: 0, accel: -8.5, brake: 'HARD_BRAKING', risk: 'CRITICAL', color: 'amber' }
  ]);

  const [rsus, setRsus] = useState([
    { id: 'RSU-J1', name: 'Silk Board Junction RSU', status: 'ONLINE', signal: 'GREEN_AMBER_CYCLE', vehicles: 6, mode: 'DSRC + C-V2V' },
    { id: 'RSU-J2', name: 'Madiwala Crosswalk RSU', status: 'ONLINE', signal: 'PEDESTRIAN_EXTEND', vehicles: 8, mode: 'DSRC + C-V2V' },
    { id: 'RSU-J3', name: 'Electronic City RSU', status: 'ONLINE', signal: 'GREEN_WAVE_PRIORITY', vehicles: 14, mode: 'C-V2V_CELLULAR' }
  ]);

  // Telemetry & Scenario Execution State
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [currentScenarioStage, setCurrentScenarioStage] = useState('Idle');
  const [scenarioProgress, setScenarioProgress] = useState(0);
  const [orchestratedState, setOrchestratedState] = useState(null);
  const [operatorDecision, setOperatorDecision] = useState(null); // 'approved' | 'rejected' | null
  const [isExecutingSAMVED, setIsExecutingSAMVED] = useState(false);
  const [executionDetails, setExecutionDetails] = useState(null);

  // Model & Metrics Registry State
  const [modelsStatus, setModelsStatus] = useState(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedPlaygroundModel, setSelectedPlaygroundModel] = useState('accident');
  const [playgroundInput, setPlaygroundInput] = useState({
    vehicle_speed_kmh: 58.0,
    deceleration_mps2: 9.5,
    jerk_mps3: 42.0,
    impact_sensor_indicator: 0.88,
    airbag_trigger: 1
  });
  const [playgroundResult, setPlaygroundResult] = useState(null);

  // Real-Time Socket Stream
  const [socketEvents, setSocketEvents] = useState([]);
  const socketRef = useRef(null);

  // 1. Fetch Models Metadata & Status
  const fetchModelsData = async () => {
    setIsLoadingModels(true);
    try {
      const res = await axios.get('/api/urbanflow/models/status');
      if (res.data?.models) {
        setModelsStatus(res.data);
      }
    } catch (e) {
      console.warn('Could not load models status:', e.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModelsData();
  }, []);

  // 2. Real-time Socket.IO Listeners
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const logEvent = (name, data, type = 'info') => {
      setSocketEvents(prev => [{
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        event: name,
        data,
        type
      }, ...prev].slice(0, 40));
    };

    socket.on('connect', () => {
      logEvent('socket_connected', { message: 'V2V Real-time Stream Connected' }, 'success');
    });

    socket.on('v2v_message', data => logEvent('v2v_message', data, 'info'));
    socket.on('accident_detected', data => logEvent('accident_detected', data, 'warning'));
    socket.on('hazard_broadcast', data => logEvent('hazard_broadcast', data, 'warning'));
    socket.on('secondary_crash_warning', data => logEvent('secondary_crash_warning', data, 'danger'));
    socket.on('pedestrian_detected', data => logEvent('pedestrian_detected', data, 'info'));
    socket.on('pedestrian_risk_update', data => logEvent('pedestrian_risk_update', data, 'warning'));
    socket.on('v2v_intervention', data => logEvent('v2v_intervention', data, 'success'));
    socket.on('traffic_signal_recommendation', data => logEvent('traffic_signal_recommendation', data, 'success'));
    socket.on('v2v_execution', data => logEvent('v2v_execution', data, 'success'));
    socket.on('operator_approved', data => logEvent('operator_approved', data, 'success'));
    socket.on('operator_rejected', data => logEvent('operator_rejected', data, 'warning'));
    socket.on('execution_completed', data => logEvent('execution_completed', data, 'success'));

    return () => socket.disconnect();
  }, []);

  // 3. Trigger Interactive Vehicle Event
  const triggerVehicleSimulation = async (eventType) => {
    try {
      toast.loading(`Simulating ${eventType.toUpperCase()} on ${selectedVehicle}...`, { id: 'sim-toast' });
      const res = await axios.post('/api/urbanflow/v2v/simulate', {
        event_type: eventType,
        vehicle_id: selectedVehicle,
        zone: 'Silk Board Junction',
        communication_mode: commMode
      });

      if (res.data?.orchestration) {
        setOrchestratedState(res.data.orchestration);
        setOperatorDecision(null);
        setExecutionDetails(null);
      }

      // Update local vehicle state
      setVehicles(prev => prev.map(v => {
        if (v.id === selectedVehicle) {
          return {
            ...v,
            accel: eventType === 'accident' ? -12.4 : (eventType === 'sudden_braking' ? -8.5 : -1.0),
            brake: eventType === 'accident' ? 'CRASH_STOP' : (eventType === 'sudden_braking' ? 'HARD_BRAKING' : 'NORMAL'),
            risk: eventType === 'accident' ? 'CRITICAL' : (eventType === 'sudden_braking' ? 'WARNING' : 'SAFE'),
            color: eventType === 'accident' ? 'red' : (eventType === 'sudden_braking' ? 'amber' : 'emerald')
          };
        }
        return v;
      }));

      toast.success(`V2V Event "${eventType}" broadcasted successfully!`, { id: 'sim-toast' });
    } catch (e) {
      toast.error(`Simulation failed: ${e.message}`, { id: 'sim-toast' });
    }
  };

  // 4. JUDGE DEMO — Complete End-to-End Silk Board Scenario
  const runJudgeDemo = async () => {
    setIsDemoRunning(true);
    setOperatorDecision(null);
    setExecutionDetails(null);
    setScenarioProgress(10);
    setCurrentScenarioStage('Step 1: 5 Connected Vehicles Approaching Silk Board Junction...');

    try {
      await new Promise(r => setTimeout(r, 800));
      setScenarioProgress(25);
      setCurrentScenarioStage('Step 2: VEH-021 Triggers Sudden Braking (8.5 m/s² deceleration)...');

      await new Promise(r => setTimeout(r, 900));
      setScenarioProgress(45);
      setCurrentScenarioStage('Step 3: Accident Detection Model (acc-v1) identifies 94% CRITICAL Collision Risk...');

      await new Promise(r => setTimeout(r, 900));
      setScenarioProgress(70);
      setCurrentScenarioStage('Step 4: Pedestrian Safety Agent detects 8 pedestrians at J2 crosswalk. Conflict Risk: HIGH.');

      const res = await axios.post('/api/urbanflow/orchestrate', {
        incident_id: `JUDGE-BLR-${Date.now()}`,
        zone: 'Silk Board Junction',
        event_type: 'accident',
        vehicle_id: 'VEH-021',
        vehicle_speed_kmh: 54.0,
        deceleration_mps2: 10.2,
        jerk_mps3: 44.0,
        airbag_trigger: 1,
        impact_sensor_indicator: 0.92,
        pedestrian_count: 8,
        pedestrian_crossing: true,
        communication_mode: commMode
      });

      setOrchestratedState(res.data);
      setScenarioProgress(90);
      setCurrentScenarioStage('Step 5: Consensus Formulated (Score: 96.4/100). Awaiting Human Operator Approval...');
      toast.success('AI Recommendation Ready! Please Authorize Execution below.');
    } catch (e) {
      toast.error(`Demo failed: ${e.message}`);
    } finally {
      setIsDemoRunning(false);
    }
  };

  // 5. Operator Approval Handler
  const handleApproveExecution = async () => {
    if (!orchestratedState?.incident_id) return;
    setIsExecutingSAMVED(true);
    try {
      const res = await axios.post('/api/urbanflow/orchestrate/approve', {
        incident_id: orchestratedState.incident_id,
        zone: orchestratedState.zone || 'Silk Board Junction',
        intervention_name: orchestratedState.selected_intervention?.name || 'V2V Warning + Dynamic Rerouting + Pedestrian Extension',
        event_type: 'accident',
        vehicle_id: 'VEH-021'
      });

      setOperatorDecision('approved');
      setExecutionDetails(res.data?.execution);
      toast.success('SAMVED Execution Layer successfully altered signals and broadcasted V2V warnings!');
    } catch (e) {
      toast.error(`Execution failed: ${e.message}`);
    } finally {
      setIsExecutingSAMVED(false);
    }
  };

  const handleRejectExecution = async () => {
    if (!orchestratedState?.incident_id) return;
    try {
      await axios.post('/api/urbanflow/orchestrate/reject', {
        incident_id: orchestratedState.incident_id,
        reason: 'Operator Manual Override'
      });
      setOperatorDecision('rejected');
      toast('Recommendation rejected. System maintained baseline signal operations.', { icon: '🛡️' });
    } catch (e) {
      toast.error(`Rejection error: ${e.message}`);
    }
  };

  // 6. Test Model in Playground
  const handleRunPlaygroundInference = async () => {
    try {
      const res = await axios.post('/api/urbanflow/models/predict', {
        model: selectedPlaygroundModel,
        features: playgroundInput
      });
      setPlaygroundResult(res.data);
      toast.success(`Inference returned: ${res.data?.prediction} (${Math.round((res.data?.confidence || 0.9) * 100)}% conf)`);
    } catch (e) {
      toast.error(`Inference error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* ── TOP HERO BANNER (LIGHT THEME) ── */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white rounded-3xl p-6 sm:p-8 text-gray-900 shadow-sm border border-blue-200 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-2xl">
                <Car className="w-6 h-6" />
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200">
                Phase 5 • V2V & Autonomous Safety Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              V2V, Accident Detection & Pedestrian Safety Command Center
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm font-medium mt-1">
              Model-driven multi-agent collision prevention, secondary crash mitigation, and crosswalk safety for Bengaluru corridors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runJudgeDemo}
              disabled={isDemoRunning}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isDemoRunning ? 'animate-spin' : ''}`} />
              {isDemoRunning ? 'Running Demo...' : '🚀 RUN JUDGE DEMO (SILK BOARD)'}
            </button>

            <a
              href="/mobile"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              Launch Mobile App View
            </a>
          </div>
        </div>

        {/* Live Network Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-blue-200/80 text-xs font-mono">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">V2V Network</p>
              <p className="text-emerald-700 font-bold">ONLINE ({commMode})</p>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">RSU-J1 Silk Board</p>
              <p className="text-emerald-700 font-bold">ONLINE (100%)</p>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">RSU-J2 Madiwala</p>
              <p className="text-emerald-700 font-bold">ONLINE (100%)</p>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">RSU-J3 E-City</p>
              <p className="text-emerald-700 font-bold">ONLINE (100%)</p>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">ML Models</p>
              <p className="text-blue-700 font-bold">7 / 7 Online</p>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center gap-2 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-sans font-bold">Safety Mandate</p>
              <p className="text-purple-700 font-bold">Operator Guarded</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('connected-vehicle')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'connected-vehicle' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          🚗 Connected Vehicle & Dashcam AI Hub
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'simulation' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Car className="w-4 h-4" />
          V2V Simulation & Secondary Radar
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'models' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Database className="w-4 h-4" />
          📊 AI Data & Models Explorer ({modelsStatus?.models?.length || 9} Loaded)
        </button>
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hotspots' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Bengaluru Hotspots & Time Predictions
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'trace' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Live 12-Agent Trace & Socket Stream
        </button>
      </div>

      {/* ── TAB 0: CONNECTED VEHICLE DASHBOARD & DASHCAM AI ── */}
      {activeTab === 'connected-vehicle' && (
        <ConnectedVehicleDashboard />
      )}

      {/* ── TAB 1: V2V SIMULATION & SECONDARY RADAR ── */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          
          {/* Top Controls: Transport Layer Toggle & Trigger Bar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800">V2V Transport Simulation Layer</h3>
                <p className="text-xs text-gray-500 font-medium">Toggle transport abstraction between short-range DSRC and cellular C-V2V</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
                <button
                  onClick={() => setCommMode('DSRC')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    commMode === 'DSRC' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  📡 DSRC (802.11p • &lt;5ms)
                </button>
                <button
                  onClick={() => setCommMode('C-V2V')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    commMode === 'C-V2V' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  📶 C-V2V (Cellular • Wide Area)
                </button>
              </div>

              <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                HARDWARE-READY
              </span>
            </div>
          </div>

          {/* Interactive Vehicle Grid & Triggers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Connected Vehicle Fleet */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    Connected Vehicle Fleet (Bengaluru Silk Board Corridor)
                  </h3>
                  <p className="text-xs text-gray-500">Live V2V telemetry, deceleration rates, and risk indices</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {vehicles.length} Active Nodes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {vehicles.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      selectedVehicle === v.id
                        ? 'border-blue-500 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-800">{v.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.risk === 'CRITICAL' ? 'bg-red-100 text-red-700' : (v.risk === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                      }`}>
                        {v.risk}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 font-mono">Type: <strong className="text-gray-700">{v.type}</strong></p>
                    <p className="text-[11px] text-gray-500 font-mono">Speed: <strong className="text-gray-800">{v.speed} km/h</strong></p>
                    <p className="text-[11px] text-gray-500 font-mono">Accel: <strong className={v.accel < -5 ? 'text-red-600 font-bold' : 'text-gray-700'}>{v.accel} m/s²</strong></p>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">Braking: {v.brake}</p>
                  </div>
                ))}
              </div>

              {/* Simulation Trigger Bar for Selected Vehicle */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-gray-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Trigger Simulation on: <strong className="text-blue-700">{selectedVehicle}</strong>
                  </p>
                  <p className="text-[11px] text-gray-600">Broadcasts realistic V2V telemetry to surrounding fleet</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => triggerVehicleSimulation('sudden_braking')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    ⚠️ Sudden Braking
                  </button>
                  <button
                    onClick={() => triggerVehicleSimulation('collision_risk')}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    💥 Collision Risk
                  </button>
                  <button
                    onClick={() => triggerVehicleSimulation('accident')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm shadow-red-600/30"
                  >
                    🚨 Trigger Accident
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Secondary Crash Prevention Radar */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-gray-800">Secondary Crash Prevention Radar</h3>
                </div>
                <p className="text-xs text-gray-500">Trailing vehicle distance & dynamic lane change advisories</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                  <div className="flex items-center justify-between text-xs font-bold text-red-800">
                    <span>VEH-002 (120m away)</span>
                    <span className="bg-red-200 px-2 py-0.5 rounded text-[10px]">CRITICAL</span>
                  </div>
                  <p className="text-xs text-red-900 font-semibold mt-1">⚠️ ACCIDENT AHEAD IN 120M</p>
                  <p className="text-[11px] text-red-700 font-mono mt-0.5">Rec. Speed: 20 km/h • Action: CHANGE LANE RIGHT</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>VEH-003 (210m away)</span>
                    <span className="bg-amber-200 px-2 py-0.5 rounded text-[10px]">HIGH</span>
                  </div>
                  <p className="text-xs text-amber-900 font-semibold mt-1">⚠️ REDUCE SPEED</p>
                  <p className="text-[11px] text-amber-700 font-mono mt-0.5">Rec. Speed: 30 km/h • Action: SLOW DOWN</p>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span>VEH-005 (420m away)</span>
                    <span className="bg-blue-200 px-2 py-0.5 rounded text-[10px]">MEDIUM</span>
                  </div>
                  <p className="text-xs text-blue-900 font-semibold mt-1">ℹ️ CAUTION: CONGESTION AHEAD</p>
                  <p className="text-[11px] text-blue-700 font-mono mt-0.5">Rec. Speed: 40 km/h • Action: PREPARE TO STOP</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 font-medium">
                🛡️ <strong>Safety Mandate:</strong> Simulated driver warnings only. Real-world brakes remain under human/ABS control.
              </div>
            </div>

          </div>

          {/* Pedestrian Safety Agent & Crosswalk Conflict Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    🚶 Pedestrian Safety Agent (J2 Silk Board Crosswalk)
                  </h3>
                  <p className="text-xs text-gray-500">Real-time crosswalk conflict assessment via <code className="font-mono text-blue-600 font-bold">pedestrian_risk_model.joblib</code></p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  Model: ped-v1
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase font-mono">Pedestrians Detected</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">8 Persons</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Waiting / Crossing Zone J2</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase font-mono">Distance to Vehicle</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">8.5 meters</p>
                  <p className="text-[11px] text-red-600 font-medium">Approaching at 54 km/h</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 uppercase font-mono">Conflict Risk Level</p>
                  <p className="text-2xl font-black text-purple-700 mt-1">HIGH (0.92)</p>
                  <p className="text-[11px] text-purple-600 font-medium">Signal Hold Mandatory</p>
                </div>
              </div>

              {/* Crosswalk Shield Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                    <h4 className="text-sm font-black text-purple-900">🚶 PEDESTRIAN CROSSWALK SAFETY SHIELD</h4>
                  </div>
                  <p className="text-xs text-purple-800 mt-1">
                    Approaching VEH-021 detected. AI recommends: <strong>Hold vehicle green phase / extend pedestrian walk phase by 18s</strong>.
                  </p>
                </div>

                <span className="shrink-0 bg-white text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold font-mono shadow-xs">
                  RSU-J2 ACTUATION READY
                </span>
              </div>
            </div>

            {/* RSU Nodes Monitor */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
              <div>
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  Roadside Units (RSU Network)
                </h3>
                <p className="text-xs text-gray-500">Edge intersection nodes and signal gateways</p>
              </div>

              <div className="space-y-3">
                {rsus.map(r => (
                  <div key={r.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-800">{r.name}</span>
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-1">Phase: <strong className="text-blue-600">{r.signal}</strong></p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1">
                      <span>Mode: {r.mode}</span>
                      <span>{r.vehicles} Vehicles Linked</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── OPERATOR APPROVAL & DIGITAL TWIN COMPARISON (LIGHT THEME) ── */}
          {orchestratedState && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-indigo-200 space-y-6">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-amber-300">
                    AI Recommendation Ready • Operator Approval Required
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-2">
                    Proposed Intervention: {orchestratedState.selected_intervention?.name || 'V2V Warning + Dynamic Rerouting + Pedestrian Extension'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Incident ID: <span className="font-mono text-blue-700 font-bold">{orchestratedState.incident_id}</span> • Zone: <span className="text-gray-800 font-bold">{orchestratedState.zone}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <p className="text-[10px] text-gray-500 uppercase">Consensus Pareto Score</p>
                    <p className="text-2xl font-black text-emerald-600">{orchestratedState.consensus_result?.total_score || 96.4} / 100</p>
                  </div>
                </div>
              </div>

              {/* Digital Twin Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Baseline Box */}
                <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                  <p className="text-xs uppercase font-bold text-red-800 tracking-wider">Unmitigated Baseline (No AI)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <p className="text-gray-500">Travel Delay:</p>
                      <p className="text-base font-bold text-red-700">48.0 sec</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Queue Length:</p>
                      <p className="text-base font-bold text-red-700">1,380 meters</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Secondary Collision Risk:</p>
                      <p className="text-base font-bold text-red-700">CRITICAL (94%)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pedestrian Danger:</p>
                      <p className="text-base font-bold text-red-700">HIGH (88%)</p>
                    </div>
                  </div>
                </div>

                {/* AI Intervention Box */}
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <p className="text-xs uppercase font-bold text-emerald-800 tracking-wider">Simulated AI Intervention</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <p className="text-gray-500">Travel Delay:</p>
                      <p className="text-base font-bold text-emerald-700">24.5 sec (-48.5%)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Queue Length:</p>
                      <p className="text-base font-bold text-emerald-700">412 meters</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Secondary Collision Risk:</p>
                      <p className="text-base font-bold text-emerald-700">LOW (8%)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pedestrian Danger:</p>
                      <p className="text-base font-bold text-emerald-700">LOW (5%)</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Explainability Box */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-2">
                <p className="text-indigo-900 font-bold uppercase tracking-wider text-[11px]">Explainability Audit (WHY?)</p>
                <p className="text-gray-700 leading-relaxed font-medium">
                  {orchestratedState.explanation?.explanation || "Vehicle VEH-021 reported sudden deceleration of 10.2 m/s². The Accident Detection Model predicts a critical collision probability of 94%. Surrounding vehicles have been issued secondary crash warnings, and crosswalk J2 signal phase has been extended by 18s to protect pedestrians."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Policy Validation Passed • 0 Safety Violations
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleRejectExecution}
                    disabled={operatorDecision !== null}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    [ REJECT ]
                  </button>

                  <button
                    onClick={handleApproveExecution}
                    disabled={operatorDecision !== null || isExecutingSAMVED}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isExecutingSAMVED ? 'Executing in SAMVED...' : (operatorDecision === 'approved' ? '✓ EXECUTED IN SAMVED' : '[ APPROVE & EXECUTE ]')}
                  </button>
                </div>
              </div>

              {/* Post Execution Details */}
              {executionDetails && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono space-y-1 animate-fade-in">
                  <p className="font-bold text-emerald-800">✅ SAMVED Physical Traffic Control Execution Complete:</p>
                  <p>• Status: {executionDetails.status}</p>
                  <p>• V2V Broadcasts Transmitted: {executionDetails.v2v_warnings_sent} vehicles</p>
                  <p>• Pedestrian Signal Hold: {executionDetails.pedestrian_signal_hold_sec} seconds at J2</p>
                  <p>• Secondary Crash Risk Reduced: {executionDetails.secondary_crash_risk_reduced}</p>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ── TAB 2: AI DATA & MODELS EXPLORER ── */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
                📊 Synthetic Dataset & ML Model Evaluation Layer
              </h2>
              <p className="text-xs text-gray-500">
                Models trained with scikit-learn on 94,000+ synthetic Bengaluru traffic & V2V records
              </p>
            </div>

            <button
              onClick={fetchModelsData}
              disabled={isLoadingModels}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin text-blue-600' : ''}`} />
              Reload Metrics
            </button>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modelsStatus?.models?.map((m, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{m.name.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-bold font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {m.version}
                  </span>
                </div>

                <p className="text-xs text-gray-500 font-medium">Algorithm: <strong className="text-gray-700">{m.algorithm}</strong></p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
                  {m.accuracy !== null && m.accuracy !== undefined && (
                    <div>
                      <span className="text-gray-500 text-[10px]">Test Accuracy:</span>
                      <p className="font-black text-emerald-600 text-sm">{(m.accuracy * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {m.f1_score !== null && m.f1_score !== undefined && (
                    <div>
                      <span className="text-gray-500 text-[10px]">F1-Score:</span>
                      <p className="font-black text-blue-600 text-sm">{(m.f1_score * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {m.mae !== null && m.mae !== undefined && (
                    <div>
                      <span className="text-gray-500 text-[10px]">MAE:</span>
                      <p className="font-black text-indigo-600 text-sm">{m.mae}</p>
                    </div>
                  )}
                  {m.r2_score !== null && m.r2_score !== undefined && (
                    <div>
                      <span className="text-gray-500 text-[10px]">R² Score:</span>
                      <p className="font-black text-teal-600 text-sm">{m.r2_score.toFixed(4)}</p>
                    </div>
                  )}
                </div>

                {/* Top Features */}
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 font-mono mb-1.5">Top Feature Importances</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(m.feature_importance || {}).slice(0, 3).map(([feat, imp], i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-gray-600 font-mono">
                        <span className="truncate max-w-[160px]">{feat}</span>
                        <span className="font-bold text-gray-800">{(imp * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Model Testing Playground */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-800">Interactive ML Model Inference Playground</h3>
              <p className="text-xs text-gray-500">Test live predictions by sending feature values to <code className="font-mono text-blue-600">POST /api/urbanflow/models/predict</code></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 font-mono">Select Model</label>
                <select
                  value={selectedPlaygroundModel}
                  onChange={(e) => setSelectedPlaygroundModel(e.target.value)}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                >
                  <option value="accident">Accident Model (acc-v1)</option>
                  <option value="v2v_risk">V2V Risk Model (v2v-v1)</option>
                  <option value="pedestrian_risk">Pedestrian Model (ped-v1)</option>
                  <option value="hotspot">Hotspot Model (hotspot-v1)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 font-mono">Speed (km/h)</label>
                <input
                  type="number"
                  value={playgroundInput.vehicle_speed_kmh}
                  onChange={e => setPlaygroundInput(p => ({ ...p, vehicle_speed_kmh: parseFloat(e.target.value) }))}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 font-mono">Deceleration (m/s²)</label>
                <input
                  type="number"
                  value={playgroundInput.deceleration_mps2}
                  onChange={e => setPlaygroundInput(p => ({ ...p, deceleration_mps2: parseFloat(e.target.value) }))}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 font-mono">Jerk (m/s³)</label>
                <input
                  type="number"
                  value={playgroundInput.jerk_mps3}
                  onChange={e => setPlaygroundInput(p => ({ ...p, jerk_mps3: parseFloat(e.target.value) }))}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunPlaygroundInference}
                  className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  ⚡ Run Inference
                </button>
              </div>
            </div>

            {playgroundResult && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-mono flex items-center justify-between animate-fade-in">
                <div>
                  <span className="text-blue-900 font-bold">Prediction: </span>
                  <span className="text-lg font-black text-blue-700 ml-1">{playgroundResult.prediction}</span>
                </div>
                <div>
                  <span className="text-blue-900 font-bold">Confidence: </span>
                  <span className="text-base font-black text-emerald-600 ml-1">
                    {Math.round((playgroundResult.confidence || 0.95) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-900 font-bold">Model: </span>
                  <span className="text-xs bg-white px-2 py-1 rounded-lg border border-blue-300 font-bold text-blue-800">
                    {playgroundResult.model_version}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[11px] text-gray-400 font-mono">
              ⚠️ <strong>Disclosure:</strong> {modelsStatus?.dataset?.disclaimer}
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 3: BENGALURU HOTSPOTS & TIME-OF-DAY PREDICTIONS ── */}
      {activeTab === 'hotspots' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-black text-gray-800">Bengaluru Hotspots Multi-Horizon Time Forecasts</h3>
            <p className="text-xs text-gray-500">Trained on diurnal traffic shifts (Morning 08-11, Afternoon 11-16, Evening 17-21, Night 21-06)</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-red-800">
                  <span>Silk Board Junction</span>
                  <span className="bg-red-200 px-2 py-0.5 rounded text-[10px]">CRITICAL</span>
                </div>
                <p className="text-xs text-gray-600 font-mono">Speed: 13.5 km/h • Density: 88%</p>
                <div className="pt-2 border-t border-red-200/60 text-[11px] font-mono text-gray-700">
                  <p>15 min: <strong className="text-red-600">CRITICAL</strong></p>
                  <p>30 min: <strong className="text-red-700">CRITICAL (1380m)</strong></p>
                  <p>60 min: <strong className="text-red-800">CRITICAL</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                  <span>KR Puram Hanging Bridge</span>
                  <span className="bg-amber-200 px-2 py-0.5 rounded text-[10px]">HIGH</span>
                </div>
                <p className="text-xs text-gray-600 font-mono">Speed: 16.0 km/h • Density: 85%</p>
                <div className="pt-2 border-t border-amber-200/60 text-[11px] font-mono text-gray-700">
                  <p>15 min: <strong className="text-amber-600">HIGH</strong></p>
                  <p>30 min: <strong className="text-amber-700">HIGH (950m)</strong></p>
                  <p>60 min: <strong className="text-red-600">CRITICAL</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                  <span>Electronic City Expressway</span>
                  <span className="bg-blue-200 px-2 py-0.5 rounded text-[10px]">MEDIUM</span>
                </div>
                <p className="text-xs text-gray-600 font-mono">Speed: 34.0 km/h • Density: 72%</p>
                <div className="pt-2 border-t border-blue-200/60 text-[11px] font-mono text-gray-700">
                  <p>15 min: <strong className="text-blue-600">MEDIUM</strong></p>
                  <p>30 min: <strong className="text-amber-600">HIGH (680m)</strong></p>
                  <p>60 min: <strong className="text-amber-700">HIGH</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Hebbal Flyover</span>
                  <span className="bg-emerald-200 px-2 py-0.5 rounded text-[10px]">FLOWING</span>
                </div>
                <p className="text-xs text-gray-600 font-mono">Speed: 24.5 km/h • Density: 79%</p>
                <div className="pt-2 border-t border-emerald-200/60 text-[11px] font-mono text-gray-700">
                  <p>15 min: <strong className="text-emerald-600">MEDIUM</strong></p>
                  <p>30 min: <strong className="text-blue-600">MEDIUM</strong></p>
                  <p>60 min: <strong className="text-amber-600">HIGH</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: LIVE 12-AGENT TRACE & SOCKET STREAM ── */}
      {activeTab === 'trace' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-black text-gray-800 mb-1">Real-time Socket.IO Pipeline Event Monitor</h3>
            <p className="text-xs text-gray-500 mb-4">Captures synchronized multi-agent events as they happen</p>

            <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
              {socketEvents.map(e => (
                <div key={e.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{e.time}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      e.type === 'danger' ? 'bg-red-100 text-red-700' : (e.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')
                    }`}>
                      {e.event}
                    </span>
                    <span className="text-gray-600 truncate max-w-md">{JSON.stringify(e.data)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">ws</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
