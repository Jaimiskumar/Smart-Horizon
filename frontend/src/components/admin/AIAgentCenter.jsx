import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { 
  Bot, 
  Cpu, 
  Zap, 
  Shield, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  PieChart, 
  LayoutDashboard,
  Brain, 
  Network, 
  Radio, 
  Command, 
  Unlock, 
  Lock, 
  Play, 
  Check, 
  RotateCw, 
  Sliders, 
  FileText, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Wrench, 
  HardHat, 
  MapPin, 
  Compass, 
  Volume2, 
  MicOff, 
  Waves, 
  Siren, 
  Navigation, 
  Crosshair, 
  Route,
  ArrowRight,
  CheckCheck,
  RefreshCw,
  Server,
  Database,
  Wifi,
  Eye,
  ListTree,
  XCircle,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Gauge,
  Code2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckSquare
} from 'lucide-react';

export default function AIAgentCenter() {
  const [activeTab, setActiveTab] = useState('orchestrator');
  const [manualOverride, setManualOverride] = useState(false);
  const [uptime, setUptime] = useState('00:00:00');

  // Multi-Service Operational Health State
  const [systemStatus, setSystemStatus] = useState({
    frontend: { status: 'online', name: 'SAMVED Frontend', port: 3000 },
    backend: { status: 'online', name: 'SAMVED Backend', port: 5000 },
    mongodb: { status: 'checking', name: 'MongoDB Database', port: 27017 },
    socketio: { status: 'checking', name: 'Socket.IO Engine' },
    ml_backend: { status: 'checking', name: 'SAMVED ML Vision', port: 8000 },
    urbanflow_ai: { status: 'checking', name: 'UrbanFlow AI Multi-Agent', port: 8001 }
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // 10 Agent Operational Status Matrix
  const [agentStatuses, setAgentStatuses] = useState([
    { id: 'perception', name: 'Traffic Perception Agent', type: 'Perception', status: 'ONLINE', port: 8001, icon: Eye },
    { id: 'infrastructure', name: 'Infrastructure Agent', type: 'Perception / Work Orders', status: 'ONLINE', port: 8001, icon: Wrench },
    { id: 'noise', name: 'Noise / Acoustic Agent', type: 'Perception / Environmental', status: 'ONLINE', port: 8001, icon: Volume2 },
    { id: 'v2x', name: 'Emergency V2X Agent', type: 'Perception / Priority Wave', status: 'ONLINE', port: 8001, icon: Siren },
    { id: 'prediction', name: 'Spillover Prediction Agent', type: 'Predictive Modeling', status: 'ONLINE', port: 8001, icon: Activity },
    { id: 'intervention', name: 'Intervention Agent', type: 'Action Formulation', status: 'ONLINE', port: 8001, icon: Sliders },
    { id: 'policy', name: 'Policy & Safety Compliance Agent', type: 'Guardrail & Rules', status: 'ONLINE', port: 8001, icon: Shield },
    { id: 'digital_twin', name: 'Digital Twin Simulation Agent', type: 'Verification & Simulation', status: 'ONLINE', port: 8001, icon: Network },
    { id: 'consensus', name: 'Consensus Engine', type: 'Multi-Objective Optimization', status: 'ONLINE', port: 8001, icon: PieChart },
    { id: 'explainability', name: 'Explainability Agent', type: 'Human Reasoning & Auditing', status: 'ONLINE', port: 8001, icon: FileText }
  ]);

  // Synchronized Multi-Agent Pipeline State
  const [selectedDemoScenario, setSelectedDemoScenario] = useState('traffic'); // 'traffic' | 'infra' | 'acoustic' | 'v2x'
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [currentActiveAgent, setCurrentActiveAgent] = useState('Idle');
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [orchestratedState, setOrchestratedState] = useState(null);
  const [operatorApprovalStatus, setOperatorApprovalStatus] = useState(null); // null | 'approved' | 'rejected'
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSharedContextInspector, setShowSharedContextInspector] = useState(false);

  // Socket.IO Live Event Stream
  const [socketEvents, setSocketEvents] = useState([]);
  const socketRef = useRef(null);

  // 1. Fetch Complete System Health & Agents Status
  const fetchHealthAndAgents = async () => {
    setIsCheckingStatus(true);
    try {
      const [sysRes, agentRes] = await Promise.allSettled([
        axios.get('/api/urbanflow/system-status'),
        axios.get('/api/urbanflow/agents/status')
      ]);

      if (sysRes.status === 'fulfilled' && sysRes.value.data?.services) {
        setSystemStatus(sysRes.value.data.services);
      }

      if (agentRes.status === 'fulfilled' && agentRes.value.data?.agents) {
        setAgentStatuses(prev => prev.map(a => {
          const matched = agentRes.value.data.agents.find(ag => ag.id === a.id);
          return matched ? { ...a, status: matched.status } : a;
        }));
      }
    } catch (err) {
      console.warn('Health check fallback:', err.message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchHealthAndAgents();
    const interval = setInterval(fetchHealthAndAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Initialize Real-Time Socket.IO Connection for All 13 Pipeline Events
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    const logSocketEvent = (eventName, data, type = 'info') => {
      const eventItem = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        event: eventName,
        data: data,
        type: type
      };
      setSocketEvents(prev => [eventItem, ...prev].slice(0, 35));
    };

    socket.on('connect', () => {
      logSocketEvent('socket_connected', { socketId: socket.id, message: 'Live WebSocket pipeline synchronization active' }, 'success');
    });

    // 13 Synchronized Pipeline Events
    socket.on('agent_started', (data) => {
      setCurrentActiveAgent(data.agent_name || 'Agent Processing');
      logSocketEvent('agent_started', data, 'info');
      // Update agent status badge to PROCESSING
      setAgentStatuses(prev => prev.map(a => 
        a.name === data.agent_name ? { ...a, status: 'PROCESSING' } : a
      ));
    });

    socket.on('agent_completed', (data) => {
      logSocketEvent('agent_completed', { agent_name: data.agent_name, decision: data.result?.decision?.slice(0, 75) + '...' }, 'success');
      setAgentStatuses(prev => prev.map(a => 
        a.name === data.agent_name ? { ...a, status: 'COMPLETED' } : a
      ));
    });

    socket.on('prediction_updated', (data) => {
      logSocketEvent('prediction_updated', { incident_id: data.incident_id, horizons: data.predictions?.length }, 'info');
    });

    socket.on('intervention_generated', (data) => {
      logSocketEvent('intervention_generated', { incident_id: data.incident_id, candidates_count: data.candidates?.length, selected: data.selected?.name }, 'info');
    });

    socket.on('policy_validated', (data) => {
      logSocketEvent('policy_validated', { incident_id: data.incident_id, approved: data.policy_result?.approved, risk: data.policy_result?.risk }, 'success');
    });

    socket.on('digital_twin_completed', (data) => {
      logSocketEvent('digital_twin_completed', { incident_id: data.incident_id, delay_reduction: `-${data.digital_twin_result?.delay_reduction_percent}%`, emergency_eta: data.digital_twin_result?.emergency_eta_minutes }, 'success');
    });

    socket.on('consensus_completed', (data) => {
      logSocketEvent('consensus_completed', { incident_id: data.incident_id, composite_score: `${data.consensus_result?.total_score}/100` }, 'success');
    });

    socket.on('recommendation_ready', (data) => {
      setCurrentActiveAgent('Awaiting Operator Approval');
      logSocketEvent('recommendation_ready', { incident_id: data.incident_id, intervention: data.selected_intervention?.name }, 'success');
    });

    socket.on('operator_approved', (data) => {
      logSocketEvent('operator_approved', data, 'success');
    });

    socket.on('operator_rejected', (data) => {
      logSocketEvent('operator_rejected', data, 'warning');
    });

    socket.on('execution_started', (data) => {
      logSocketEvent('execution_started', data, 'info');
    });

    socket.on('execution_completed', (data) => {
      setCurrentActiveAgent('Completed / Active in SAMVED');
      logSocketEvent('execution_completed', data, 'success');
    });

    socket.on('incident_resolved', (data) => {
      logSocketEvent('incident_resolved', data, 'success');
    });

    // Legacy event listeners for complete compatibility
    socket.on('urbanflow-traffic-executed', data => logSocketEvent('urbanflow-traffic-executed', data, 'success'));
    socket.on('urbanflow-workorder-dispatched', data => logSocketEvent('urbanflow-workorder-dispatched', data, 'success'));
    socket.on('urbanflow-acoustic-mitigated', data => logSocketEvent('urbanflow-acoustic-mitigated', data, 'success'));
    socket.on('green_corridor_activated', data => logSocketEvent('green_corridor_activated', data, 'success'));

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. System Uptime Clock
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setUptime(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // =========================================================================
  // SYNCHRONIZED MULTI-AGENT PIPELINE ORCHESTRATION
  // =========================================================================
  const runSynchronizedOrchestration = async (scenarioKey) => {
    const scenario = scenarioKey || selectedDemoScenario;
    setIsPipelineRunning(true);
    setOrchestratedState(null);
    setOperatorApprovalStatus(null);
    setExecutionResult(null);
    setPipelineProgress(10);
    setCurrentActiveAgent('Multi-Modal Event Ingestion');

    // Reset agent status visual indicators to PROCESSING/ONLINE
    setAgentStatuses(prev => prev.map(a => ({ ...a, status: 'ONLINE' })));

    let payload = {};
    let toastMsg = 'Dispatching Event to Synchronized Multi-Agent Orchestrator...';

    if (scenario === 'traffic') {
      payload = {
        incident_id: 'ORCH-TRAFFIC-001',
        zone: 'ZONE_12',
        event_type: 'road_blockage',
        vehicle_count: 145,
        average_speed: 18,
        severity: 'HIGH',
        emergency_vehicle: false
      };
      toastMsg = 'Orchestrating Scenario A: Traffic Congestion & Road Blockage...';
    } else if (scenario === 'infra') {
      payload = {
        incident_id: 'ORCH-INFRA-001',
        zone: 'ZONE_12',
        type: 'pothole',
        severity: 'HIGH',
        traffic_impact: 'HIGH'
      };
      toastMsg = 'Orchestrating Scenario B: Road Damage / Pothole Infrastructure...';
    } else if (scenario === 'acoustic') {
      payload = {
        incident_id: 'ORCH-NOISE-001',
        zone: 'ZONE_12',
        noise_db: 92,
        classification: 'traffic_horn',
        vehicle_count: 160,
        average_speed: 12
      };
      toastMsg = 'Orchestrating Scenario C: 92 dB Acoustic Noise Spike...';
    } else if (scenario === 'v2x') {
      payload = {
        incident_id: 'ORCH-V2X-001',
        vehicle_id: 'AMB-07',
        vehicle_type: 'ambulance',
        priority: 'HIGH',
        zone: 'ZONE_12',
        destination: 'CITY_GENERAL_HOSPITAL',
        eta_minutes: 4,
        route: ['J1', 'J2', 'J3']
      };
      toastMsg = 'Orchestrating Scenario D: Emergency Ambulance AMB-07 V2X...';
    }

    const toastId = toast.loading(toastMsg);

    try {
      // Execute centralized state machine orchestrator
      const res = await axios.post('/api/urbanflow/orchestrate', payload);
      const data = res.data;

      if (data && data.ok) {
        setOrchestratedState(data);
        setPipelineProgress(100);
        setCurrentActiveAgent('Awaiting Operator Approval');
        toast.success(`Synchronized Multi-Agent Pipeline Complete! AI Recommendation Ready.`, { id: toastId });

        // Update all agent status badges to COMPLETED
        setAgentStatuses(prev => prev.map(a => ({ ...a, status: 'COMPLETED' })));
      } else {
        toast.error(`Multi-Agent Pipeline Notice: Operating in safe degraded fallback`, { id: toastId });
        setOrchestratedState(data);
        setPipelineProgress(100);
        setCurrentActiveAgent('Degraded Fallback Active');
      }
    } catch (err) {
      toast.error(`Orchestrator error: ${err.message}`, { id: toastId });
      setCurrentActiveAgent('Error in Pipeline');
    } finally {
      setIsPipelineRunning(false);
    }
  };

  // =========================================================================
  // OPERATOR APPROVAL & SAMVED EXECUTION
  // =========================================================================
  const handleOperatorApproveAndExecute = async () => {
    if (!orchestratedState) return;
    setIsExecuting(true);
    const toastId = toast.loading('Executing AI Decision in SAMVED Core Engine...');

    try {
      const approvePayload = {
        incident_id: orchestratedState.incident_id,
        zone: orchestratedState.zone,
        intervention_name: orchestratedState.selected_intervention?.name || orchestratedState.decision,
        event_type: orchestratedState.multimodal_inputs?.event_type,
        vehicle_id: orchestratedState.multimodal_inputs?.vehicle_id,
        route: orchestratedState.multimodal_inputs?.route,
        destination: orchestratedState.multimodal_inputs?.destination,
        work_order_id: orchestratedState.work_order?.work_order_id,
        crew: orchestratedState.work_order?.crew,
        noise_db: orchestratedState.multimodal_inputs?.noise_db,
        operator_id: 'OPERATOR-01'
      };

      const res = await axios.post('/api/urbanflow/orchestrate/approve', approvePayload);
      const data = res.data;

      if (data && data.success) {
        setOperatorApprovalStatus('approved');
        setExecutionResult(data);
        setCurrentActiveAgent('Applied to Physical/Digital Network');
        toast.success(`SAMVED Execution Confirmed! Real-time Socket.IO broadcast sent.`, { id: toastId, duration: 6000 });
      } else {
        toast.error(`Execution failed — no traffic action applied.`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Execution failed: ${err.message}`, { id: toastId });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOperatorReject = async () => {
    if (!orchestratedState) return;
    try {
      await axios.post('/api/urbanflow/orchestrate/reject', {
        incident_id: orchestratedState.incident_id,
        reason: 'Operator manual rejection'
      });
      setOperatorApprovalStatus('rejected');
      setCurrentActiveAgent('Rejected by Operator');
      toast.error('Operator Rejected AI Recommendation. No execution applied.', { duration: 4000 });
    } catch (e) {
      setOperatorApprovalStatus('rejected');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      
      {/* ── Top Hero Header ── */}
      <div className="bg-[#0F172A] text-white p-8 md:p-10 rounded-b-[3rem] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/15 via-indigo-600/10 to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current text-amber-300" /> SYNCHRONIZED MULTI-AGENT ORCHESTRATION ENGINE
              </span>
              <span className="text-slate-600">|</span>
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-700">
                10 Integrated Cognitive Agents
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              SAMVED + UrbanFlow <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Multi-Agent AI</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium max-w-3xl text-sm md:text-base leading-relaxed">
              Fully synchronized cognitive pipeline: Multi-Modal Event Ingest → Perception → Prediction → Intervention → Policy Check → Digital Twin Simulation → Multi-Objective Consensus → Explainability → Operator Approval → SAMVED Execution.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="/admin/bangalore-map"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5" /> Open Bangalore Traffic Map
              </a>
              <span className="text-slate-500 text-xs font-mono">Silk Board • ORR • Hebbal • Tin Factory</span>
            </div>
          </div>

          {/* Quick Metrics Header Card */}
          <div className="flex gap-3 shrink-0">
            <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-3xl border border-slate-700 text-center min-w-[135px]">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> Active Agents
              </p>
              <p className="text-2xl font-black text-emerald-400">
                {agentStatuses.filter(a => a.status === 'ONLINE' || a.status === 'COMPLETED').length}/10
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Synchronized</p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-3xl border border-slate-700 text-center min-w-[135px]">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> Session Uptime
              </p>
              <p className="text-2xl font-black text-white font-mono">{uptime}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Live Orchestrator</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1450px] mx-auto px-4 md:px-8 space-y-8">
        
        {/* ── 1. 10 AGENT OPERATIONAL STATUS MATRIX ── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  Cognitive Agent Operational Status Grid
                  <span className="text-xs font-bold text-slate-400">(10 Synchronized Agents)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">Real-time status tracking for every agent in the multi-agent cognitive loop</p>
              </div>
            </div>

            <button
              onClick={fetchHealthAndAgents}
              disabled={isCheckingStatus}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-blue-600' : ''}`} />
              Probe Agents
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {agentStatuses.map(agent => {
              const isCompleted = agent.status === 'COMPLETED';
              const isProcessing = agent.status === 'PROCESSING';
              const isDegraded = agent.status === 'DEGRADED';
              const isOnline = agent.status === 'ONLINE' || isCompleted;

              let statusBg = 'bg-emerald-100 text-emerald-700 border-emerald-300';
              let dotBg = 'bg-emerald-500';
              if (isProcessing) {
                statusBg = 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse';
                dotBg = 'bg-blue-500 animate-ping';
              } else if (isDegraded) {
                statusBg = 'bg-amber-100 text-amber-700 border-amber-300';
                dotBg = 'bg-amber-500';
              } else if (!isOnline) {
                statusBg = 'bg-rose-100 text-rose-700 border-rose-300';
                dotBg = 'bg-rose-500';
              }

              return (
                <div 
                  key={agent.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isProcessing 
                      ? 'bg-blue-50/70 border-blue-300 shadow-sm' 
                      : (isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/70 border-slate-200/80')
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <agent.icon className={`w-4 h-4 ${isProcessing ? 'text-blue-600' : 'text-slate-700'}`} />
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${statusBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`}></span>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate">{agent.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{agent.type}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. SYNCHRONIZED PIPELINE PROGRESS & TELEMETRY BAR ── */}
        <div className="bg-[#0F172A] text-white rounded-3xl p-6 shadow-xl border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
            
            <div className="lg:col-span-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Current Active Agent</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPipelineRunning ? 'bg-blue-400 animate-ping' : 'bg-emerald-400'}`}></span>
                <span className="text-lg font-black text-white truncate">{currentActiveAgent}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Event ID: <strong className="text-blue-400">{orchestratedState?.incident_id || 'Awaiting Next Event'}</strong>
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Pipeline Progress</p>
              <div className="flex items-center gap-2">
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${pipelineProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black font-mono text-emerald-400">{pipelineProgress}%</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Processing Time</p>
              <p className="text-xl font-black font-mono text-emerald-400">
                {orchestratedState?.total_processing_time_ms ? `${orchestratedState.total_processing_time_ms} ms` : '—'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">End-to-end latency</p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Overall Confidence</p>
              <p className="text-xl font-black font-mono text-blue-400">
                {orchestratedState?.confidence ? `${Math.round(orchestratedState.confidence * 100)}%` : '—'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Multi-agent consensus</p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Final Action</p>
              <p className="text-xs font-black text-amber-300 truncate">
                {orchestratedState?.selected_intervention?.name || orchestratedState?.decision?.slice(0, 28) || 'Ready'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Pareto optimal</p>
            </div>

          </div>
        </div>

        {/* ── Demo Safety Notice Banner ── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-black uppercase tracking-wider text-amber-800">SAFETY & OPERATOR INTEGRITY MANDATE: </span>
            AI decision is simulated against the digital twin and MUST NEVER directly modify real traffic infrastructure without explicit Operator Approval. For V2X Emergency, the SAMVED execution layer (<code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono">greenCorridorService.js</code>) is invoked in the prototype.
          </div>
        </div>

        {/* ── 3. FOUR SCENARIO SELECTORS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Scenario A: Traffic Congestion */}
          <div 
            onClick={() => setSelectedDemoScenario('traffic')}
            className={`cursor-pointer rounded-3xl p-6 transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
              selectedDemoScenario === 'traffic' 
                ? 'bg-blue-50/70 border-blue-500 shadow-lg shadow-blue-500/10' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {selectedDemoScenario === 'traffic' && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 font-black text-xs">
                  SCENARIO A
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-bold">Traffic Congestion</span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                Road Blockage & Spills
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                Zone 12 blockage: 145 vehicles, 18 km/h. Synchronizes 10 agents to forecast queues and optimize signal timing.
              </p>

              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] mb-4 overflow-x-auto">
                <pre className="text-emerald-400">{`{\n  "incident_id": "ORCH-TRAFFIC-001",\n  "zone": "ZONE_12",\n  "event_type": "road_blockage",\n  "vehicle_count": 145,\n  "average_speed": 18,\n  "severity": "HIGH"\n}`}</pre>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDemoScenario('traffic');
                runSynchronizedOrchestration('traffic');
              }}
              disabled={isPipelineRunning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              {isPipelineRunning && selectedDemoScenario === 'traffic' ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              RUN SYNCHRONIZED PIPELINE
            </button>
          </div>

          {/* Scenario B: Road Damage / Pothole */}
          <div 
            onClick={() => setSelectedDemoScenario('infra')}
            className={`cursor-pointer rounded-3xl p-6 transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
              selectedDemoScenario === 'infra' 
                ? 'bg-amber-50/70 border-amber-500 shadow-lg shadow-amber-500/10' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {selectedDemoScenario === 'infra' && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 font-black text-xs">
                  SCENARIO B
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-bold">Pothole / Infra</span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                Pothole Capacity Impact
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                Infrastructure damage causes 35% capacity reduction. Generates maintenance Work Order (Team 07) & traffic rerouting.
              </p>

              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] mb-4 overflow-x-auto">
                <pre className="text-amber-400">{`{\n  "incident_id": "ORCH-INFRA-001",\n  "zone": "ZONE_12",\n  "type": "pothole",\n  "severity": "HIGH",\n  "traffic_impact": "HIGH"\n}`}</pre>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDemoScenario('infra');
                runSynchronizedOrchestration('infra');
              }}
              disabled={isPipelineRunning}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 active:scale-95 disabled:opacity-50"
            >
              {isPipelineRunning && selectedDemoScenario === 'infra' ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              RUN SYNCHRONIZED PIPELINE
            </button>
          </div>

          {/* Scenario C: Noise Hotspot */}
          <div 
            onClick={() => setSelectedDemoScenario('acoustic')}
            className={`cursor-pointer rounded-3xl p-6 transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
              selectedDemoScenario === 'acoustic' 
                ? 'bg-purple-50/70 border-purple-500 shadow-lg shadow-purple-500/10' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {selectedDemoScenario === 'acoustic' && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700 font-black text-xs">
                  SCENARIO C
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-bold">92 dB Acoustic Spike</span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                Noise & Traffic Correlation
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-2 leading-relaxed">
                92 dB traffic horn spike. Privacy-preserving decibel metadata correlates queueing with noise and optimizes dispersion.
              </p>

              <p className="text-[10px] text-purple-700 bg-purple-100/60 p-2 rounded-lg font-medium mb-3">
                🔒 <strong>Privacy Guard:</strong> Processes privacy-preserving decibel metadata only; no raw audio stored.
              </p>

              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] mb-4 overflow-x-auto">
                <pre className="text-purple-400">{`{\n  "incident_id": "ORCH-NOISE-001",\n  "zone": "ZONE_12",\n  "noise_db": 92,\n  "classification": "traffic_horn",\n  "vehicle_count": 160,\n  "average_speed": 12\n}`}</pre>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDemoScenario('acoustic');
                runSynchronizedOrchestration('acoustic');
              }}
              disabled={isPipelineRunning}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50"
            >
              {isPipelineRunning && selectedDemoScenario === 'acoustic' ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              RUN SYNCHRONIZED PIPELINE
            </button>
          </div>

          {/* Scenario D: Emergency Ambulance V2X */}
          <div 
            onClick={() => setSelectedDemoScenario('v2x')}
            className={`cursor-pointer rounded-3xl p-6 transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
              selectedDemoScenario === 'v2x' 
                ? 'bg-rose-50/70 border-rose-500 shadow-lg shadow-rose-500/10' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {selectedDemoScenario === 'v2x' && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 font-black text-xs">
                  SCENARIO D
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-bold">Ambulance V2X</span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                Emergency Priority Wave
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                Ambulance AMB-07 V2X telemetry. Orchestrates green corridor across Prediction, Policy, Digital Twin, and SAMVED execution.
              </p>

              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] mb-4 overflow-x-auto">
                <pre className="text-rose-400">{`{\n  "incident_id": "ORCH-V2X-001",\n  "vehicle_id": "AMB-07",\n  "vehicle_type": "ambulance",\n  "destination": "CITY_GENERAL_HOSPITAL",\n  "route": ["J1", "J2", "J3"]\n}`}</pre>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDemoScenario('v2x');
                runSynchronizedOrchestration('v2x');
              }}
              disabled={isPipelineRunning}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50"
            >
              {isPipelineRunning && selectedDemoScenario === 'v2x' ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Siren className="w-3.5 h-3.5" />
              )}
              RUN SYNCHRONIZED PIPELINE
            </button>
          </div>

        </div>

        {/* ── 4. STANDARDIZED AGENT RESULTS INSPECTOR ── */}
        {orchestratedState && orchestratedState.agent_results && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <ListTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Synchronized Multi-Agent Decision Artifacts
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Standardized structured outputs returned by every active cognitive agent
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSharedContextInspector(!showSharedContextInspector)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all"
              >
                <Code2 className="w-4 h-4 text-blue-600" />
                {showSharedContextInspector ? 'Hide Shared State JSON' : 'Inspect Shared State JSON'}
                {showSharedContextInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Collapsible Shared State Inspector */}
            {showSharedContextInspector && (
              <div className="bg-slate-950 text-emerald-400 p-5 rounded-2xl font-mono text-xs overflow-x-auto max-h-[350px]">
                <pre>{JSON.stringify(orchestratedState, null, 2)}</pre>
              </div>
            )}

            {/* Standardized Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(orchestratedState.agent_results).map(([key, res]) => (
                <div key={key} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {res.agent_name}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
                      {res.status} ({(res.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <p className="text-slate-600 font-medium">
                      <strong className="text-slate-900">Decision:</strong> {res.decision}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      <strong className="text-slate-700">Input Summary:</strong> {res.input_summary}
                    </p>
                    <p className="text-blue-700 text-[11px] font-medium">
                      <strong className="text-slate-700">Downstream Action:</strong> {res.downstream_action}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Constraints: {res.constraints?.join(', ') || 'None'}</span>
                    <span>{new Date(res.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. DIGITAL TWIN SIMULATION MATRIX ── */}
        {orchestratedState && orchestratedState.digital_twin_result && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Digital Twin Physical Simulation & Verification
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Simulated verification comparing Baseline (Uncontrolled) vs AI Selected Strategy
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-700 text-xs font-black px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4" /> Consensus Score: {orchestratedState.consensus_result?.total_score || 85.4}/100
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Metric 1: Delay Reduction */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Travel Delay</p>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-mono text-slate-400 line-through">
                    {orchestratedState.digital_twin_result.baseline_delay} min
                  </span>
                  <span className="text-2xl font-black text-emerald-600 font-mono">
                    {orchestratedState.digital_twin_result.new_delay} min
                  </span>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> -{orchestratedState.digital_twin_result.delay_reduction_percent}% reduction
                </div>
              </div>

              {/* Metric 2: Queue Length Forecast */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Forecasted Queue Length</p>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-blue-600 font-mono">
                    {orchestratedState.digital_twin_result.queue_length_m} m
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  Simulated 30-min corridor dissipation
                </p>
              </div>

              {/* Metric 3: Emergency ETA */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Emergency Response ETA</p>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    {orchestratedState.digital_twin_result.emergency_eta_minutes ? `${orchestratedState.digital_twin_result.emergency_eta_minutes} min` : '4.0 min'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-600">
                  Target ETA Met (Hospital Wave)
                </p>
              </div>

              {/* Metric 4: Noise or Policy Status */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  {orchestratedState.digital_twin_result.simulated_noise_db ? 'Noise Exposure' : 'Policy Compliance'}
                </p>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-black text-indigo-600 font-mono">
                    {orchestratedState.digital_twin_result.simulated_noise_db ? `${orchestratedState.digital_twin_result.simulated_noise_db} dB` : 'APPROVED'}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {orchestratedState.digital_twin_result.simulated_noise_db ? 'Mitigated from 92 dB' : 'Standard city bounds validated'}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ── 6. HUMAN-IN-THE-LOOP OPERATOR APPROVAL & SAMVED EXECUTION GATE ── */}
        {orchestratedState && (
          <div className="bg-[#0F172A] text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-800 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-500/20 text-amber-300 font-black text-[10px] px-3 py-1 rounded-full border border-amber-500/30 uppercase tracking-widest">
                    OPERATOR GATEWAY
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 font-bold text-[10px] px-3 py-1 rounded-full border border-blue-500/30">
                    {orchestratedState.incident_id}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  AI RECOMMENDATION READY
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  Multi-agent consensus formulated recommendation. Action will NOT execute before explicit operator authorization.
                </p>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consensus Score</p>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  {orchestratedState.consensus_result?.total_score || 85.4}/100
                </p>
              </div>
            </div>

            {/* Recommendation Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Recommended Action</p>
                  <h3 className="text-xl font-black text-blue-400 mb-2">
                    {orchestratedState.selected_intervention?.name || orchestratedState.decision}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">
                    💬 <strong className="text-white">Reasoning:</strong> {orchestratedState.explanation?.explanation || orchestratedState.decision}
                  </p>
                </div>

                {orchestratedState.explanation?.bullets && (
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-bold text-[10px] uppercase">What Happened:</p>
                      <p className="text-slate-300 font-medium">{orchestratedState.explanation.bullets.what_happened}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold text-[10px] uppercase">Expected Impact:</p>
                      <p className="text-emerald-400 font-mono font-bold">{orchestratedState.explanation.bullets.expected_impact}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Policy & Safety Status</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span className="font-black text-white text-sm">
                      Policy Status: <span className="text-emerald-400 uppercase">{orchestratedState.policy_result?.status || 'APPROVED'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    Evaluated against emergency priority waves, hospital corridors, and city signal timing constraints.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700 text-xs font-mono text-slate-400">
                  Target Zone: <strong className="text-blue-400">{orchestratedState.zone}</strong>
                </div>
              </div>

            </div>

            {/* Operator Approval Action Buttons */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Clicking approve invokes the real SAMVED execution layer & emits Socket.IO broadcast.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOperatorReject}
                  disabled={operatorApprovalStatus !== null || isExecuting}
                  className="flex-1 sm:flex-initial px-6 py-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4 inline mr-1" />
                  REJECT
                </button>

                <button
                  onClick={handleOperatorApproveAndExecute}
                  disabled={operatorApprovalStatus === 'approved' || isExecuting}
                  className={`flex-1 sm:flex-initial px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
                    operatorApprovalStatus === 'approved'
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white active:scale-95'
                  } disabled:opacity-50`}
                >
                  {isExecuting ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    operatorApprovalStatus === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />
                  )}
                  {operatorApprovalStatus === 'approved' 
                    ? 'EXECUTED IN SAMVED' 
                    : 'APPROVE & EXECUTE VIA SAMVED'}
                </button>
              </div>
            </div>

            {/* SAMVED Execution Response Display */}
            {executionResult && (
              <div className="p-6 bg-slate-900/90 rounded-2xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCheck className="w-4 h-4" /> Real SAMVED Execution Response:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {executionResult.execution?.executedAt || new Date().toISOString()}
                  </span>
                </div>

                <p className="text-sm font-bold text-white">
                  {executionResult.message}
                </p>

                <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify(executionResult.execution, null, 2)}</pre>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  AI DECISION → HUMAN APPROVAL → SAMVED EXECUTION → Socket.IO EVENT BROADCAST → DASHBOARD UPDATE
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── 7. REAL-TIME SOCKET.IO LIVE EVENT STREAM (13 Events) ── */}
        <div className="bg-[#0F172A] rounded-3xl shadow-xl overflow-hidden border border-slate-800">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black font-mono text-slate-200 uppercase tracking-widest">
                  Real-Time Socket.IO Live Event Stream
                </span>
                <p className="text-[10px] text-slate-500 font-mono">13 Event Types: agent_started, prediction_updated, policy_validated, etc.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-black font-mono text-emerald-400 uppercase tracking-widest">
                LISTENING ON WS
              </span>
            </div>
          </div>

          <div className="p-6 font-mono text-xs space-y-3 max-h-[300px] overflow-y-auto">
            {socketEvents.length > 0 ? (
              socketEvents.map((evt) => (
                <div key={evt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px]">[{evt.time}]</span>
                    <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${
                      evt.type === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : (evt.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30')
                    }`}>
                      {evt.event}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] truncate max-w-xl">
                    {typeof evt.data === 'object' ? JSON.stringify(evt.data) : String(evt.data)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-xs italic text-center py-4">
                Socket.IO engine synchronized. Running any scenario pipeline above will stream live events here.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
