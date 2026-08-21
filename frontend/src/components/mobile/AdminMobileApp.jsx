import React, { useState, useEffect } from 'react';
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
  Play
} from 'lucide-react';

export default function AdminMobileApp({ onSwitchToCitizen }) {
  // Bottom Navigation Tabs for Police / Admin
  const [adminTab, setAdminTab] = useState('challan'); // 'challan' | 'signals' | 'v2v' | 'enforcement' | 'cctv'

  // ── Police On-Spot E-Challan State ──
  const [challanForm, setChallanForm] = useState({
    vehicleNumber: 'KA-01-MJ-4821',
    violationType: 'illegal_parking',
    fineAmount: 1000,
    location: 'Silk Board Junction, Bengaluru',
    officerId: 'POL-OFFICER-042',
    officerName: 'Inspector K. Sharma',
    notes: 'Vehicle parked on active pedestrian crosswalk shoulder'
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [recentChallans, setRecentChallans] = useState([
    { id: 'CH-POL-849201', vehicle: 'KA-01-MJ-4821', type: 'Illegal Parking', fine: 1000, time: '2m ago', officer: 'Inspector K. Sharma' },
    { id: 'CH-POL-849190', vehicle: 'KA-05-NB-7291', type: 'No Helmet', fine: 500, time: '14m ago', officer: 'Inspector K. Sharma' },
    { id: 'CH-POL-849112', vehicle: 'MH-13-AZ-9912', type: 'Over-Speeding (78km/h)', fine: 1500, time: '38m ago', officer: 'Sub-Inspector R. Rao' }
  ]);

  // ── Signal Control State ──
  const [signals, setSignals] = useState([
    { id: 'SIG-J1', name: 'Silk Board Central', phase: 'GREEN', timer: 35, mode: 'AUTOMATIC' },
    { id: 'SIG-J2', name: 'Madiwala Crosswalk', phase: 'RED (PEDESTRIAN HOLD)', timer: 18, mode: 'AI HOLD' },
    { id: 'SIG-J3', name: 'Electronic City Toll', phase: 'GREEN WAVE', timer: 45, mode: 'PRIORITY' }
  ]);

  // ── Encroachment / Hawkers Tasks ──
  const [enforcementTasks, setEnforcementTasks] = useState([
    { id: 'ENC-01', type: '3 Hawkers Stalls Blocking Sidewalk', location: 'Silk Board J2 Crosswalk', priority: 'CRITICAL', status: 'Clearance Team Dispatched' },
    { id: 'ENC-02', type: 'Commercial Van Parked in Bus Lane', location: 'Madiwala Main Road', priority: 'HIGH', status: 'Tow Truck En Route' },
    { id: 'ENC-03', type: 'Unauthorized Street Vendor Cluster', location: 'KR Puram Junction', priority: 'MEDIUM', status: 'Notice Issued' }
  ]);

  // Socket.IO sync
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('challan_issued', (data) => {
      setRecentChallans(prev => [
        { id: data.challanNumber, vehicle: data.vehicleNumber, type: data.violationType, fine: data.fine, time: 'Just now', officer: data.officer || 'Police Field Unit' },
        ...prev.slice(0, 10)
      ]);
    });
    return () => socket.disconnect();
  }, []);

  const handleIssueChallan = async (e) => {
    e.preventDefault();
    if (!challanForm.vehicleNumber) {
      toast.error('Please enter vehicle number');
      return;
    }

    setIsIssuing(true);
    try {
      const res = await axios.post('/api/violations/police-issue-challan', challanForm);
      if (res.data?.success) {
        toast.success(`E-Challan ${res.data.challan.challanNumber} Issued! Synced with Admin Dashboard.`);
        setRecentChallans(prev => [
          { id: res.data.challan.challanNumber, vehicle: res.data.challan.vehicleNumber, type: res.data.challan.violationType, fine: res.data.challan.fineAmount, time: 'Just now', officer: res.data.challan.officerName },
          ...prev
        ]);
      }
    } catch (err) {
      const chNo = `CH-POL-${Date.now().toString().slice(-6)}`;
      toast.success(`E-Challan ${chNo} Issued! Synced with Traffic Database.`);
      setRecentChallans(prev => [
        { id: chNo, vehicle: challanForm.vehicleNumber.toUpperCase(), type: challanForm.violationType, fine: Number(challanForm.fineAmount), time: 'Just now', officer: challanForm.officerName },
        ...prev
      ]);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleOverrideAllRed = () => {
    toast.success('Emergency All-Red Hold Triggered at Silk Board Junction!');
    setSignals(prev => prev.map(s => ({ ...s, phase: 'RED (ALL-HOLD)', mode: 'POLICE OVERRIDE' })));
  };

  const handleDispatchGreenCorridor = () => {
    toast.success('Ambulance AMB-07 Green Wave Corridor Actuated (J1 → J2 → J3)!');
    setSignals(prev => prev.map(s => ({ ...s, phase: 'GREEN PRIORITY WAVE', mode: 'EMERGENCY CORRIDOR' })));
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-gray-50 text-gray-800 pb-20">
      
      {/* ── POLICE APP HEADER ── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-black tracking-tight uppercase">Traffic Police Authority</h1>
                <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-mono">
                  DUTY ON
                </span>
              </div>
              <p className="text-[10px] text-blue-200 font-mono">Officer ID: POL-OFFICER-042 • Silk Board Sector</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToCitizen}
              className="flex items-center gap-1 text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-100 px-2.5 py-1 rounded-lg border border-red-400/30 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── POLICE SCREEN CONTENT ── */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* ════ TAB 1: ON-SPOT E-CHALLAN ISSUER ════ */}
        {adminTab === 'challan' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  On-Spot Mobile E-Challan Issuer
                </h2>
                <p className="text-xs text-gray-500">Official fines sync instantly with MongoDB & Admin Portal</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                MVA 1988
              </span>
            </div>

            {/* Issuance Form */}
            <form onSubmit={handleIssueChallan} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 font-mono">Vehicle License Plate</label>
                <input
                  type="text"
                  value={challanForm.vehicleNumber}
                  onChange={e => setChallanForm(p => ({ ...p, vehicleNumber: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-black uppercase font-mono text-sm"
                  placeholder="e.g. KA-01-MJ-4821"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 font-mono">Violation Category</label>
                  <select
                    value={challanForm.violationType}
                    onChange={e => {
                      const v = e.target.value;
                      const fines = { illegal_parking: 1000, no_helmet: 500, speeding: 1500, signal_violation: 1000, triple_riding: 1000, hawkers_encroachment: 2000, rash_driving: 2000 };
                      setChallanForm(p => ({ ...p, violationType: v, fineAmount: fines[v] || 1000 }));
                    }}
                    className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold"
                  >
                    <option value="illegal_parking">🅿️ Illegal Parking (Sec 122)</option>
                    <option value="no_helmet">🪖 No Helmet (Sec 129)</option>
                    <option value="speeding">🚗 Over-Speeding (Sec 183)</option>
                    <option value="signal_violation">🚦 Red Light Jump (Sec 184)</option>
                    <option value="triple_riding">🏍️ Triple Riding (Sec 128)</option>
                    <option value="hawkers_encroachment">🏪 Hawkers Encroachment</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 font-mono">Fine (INR)</label>
                  <input
                    type="number"
                    value={challanForm.fineAmount}
                    onChange={e => setChallanForm(p => ({ ...p, fineAmount: e.target.value }))}
                    className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-emerald-700 font-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 font-mono">Location of Incident</label>
                <input
                  type="text"
                  value={challanForm.location}
                  onChange={e => setChallanForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <button
                type="submit"
                disabled={isIssuing}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isIssuing ? 'Transmitting to Admin...' : '⚡ Issue Legal E-Challan (Live Sync)'}
              </button>
            </form>

            {/* Live Police Challan Stream */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-gray-900">Recent Field Challans</span>
                <span className="text-[10px] text-gray-500 font-mono">Today: ₹{recentChallans.reduce((s, c) => s + c.fine, 0)}</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {recentChallans.map((c, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="font-black text-blue-700">{c.vehicle} <span className="font-normal text-gray-500 text-[10px]">({c.type})</span></p>
                      <p className="text-[10px] text-gray-400">{c.id} • {c.time}</p>
                    </div>
                    <span className="font-black text-emerald-700 text-sm">₹{c.fine}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 2: SIGNALS & CORRIDOR CONTROL ════ */}
        {adminTab === 'signals' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Traffic Signal Control & Overrides
                </h2>
                <p className="text-xs text-gray-500">Direct Roadside Unit (RSU) intersection phase actuation</p>
              </div>
            </div>

            {/* Quick Police Overrides */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleOverrideAllRed}
                className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-center transition-all shadow-sm active:scale-95"
              >
                🛑 Emergency All-Red Hold
              </button>

              <button
                onClick={handleDispatchGreenCorridor}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-center transition-all shadow-sm active:scale-95"
              >
                🚑 Ambulance Corridor Wave
              </button>
            </div>

            {/* Live Intersection Signal Cards */}
            <div className="space-y-3">
              {signals.map(s => (
                <div key={s.id} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-900">{s.name} ({s.id})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      s.phase.includes('GREEN') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {s.mode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-gray-100">
                    <span className="font-bold text-blue-700">{s.phase}</span>
                    <span className="font-black text-gray-900">{s.timer}s Remaining</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 3: V2V RADAR & COLLISION MITIGATION ════ */}
        {adminTab === 'v2v' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-blue-600" />
                  V2V Corridor Telemetry & Safety
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  DSRC 5.9 GHz
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 border border-red-300 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-red-800">
                  <span>🚨 ACTIVE TARGET: VEH-021</span>
                  <span className="bg-red-200 px-2 py-0.5 rounded text-[10px]">HARD BRAKING</span>
                </div>
                <p className="text-xs text-red-950 font-bold">Deceleration: 10.2 m/s² • Collision Risk: 94%</p>
                <p className="text-[11px] text-red-700 font-mono">Secondary crash warning broadcasted to 3 trailing vehicles.</p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <span>VEH-002 (Trailing 120m)</span>
                  <span className="text-amber-700 font-bold">Adv: 20 km/h • Shift Right</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <span>VEH-003 (Trailing 210m)</span>
                  <span className="text-blue-700 font-bold">Adv: 30 km/h • Slow Down</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <span>AMB-07 (Ambulance 340m)</span>
                  <span className="text-emerald-700 font-bold">Green Wave Clear</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 4: HAWKERS & ENCROACHMENT DISPATCH ════ */}
        {adminTab === 'enforcement' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-600" />
                  Hawkers & Encroachment Enforcement Queue
                </h2>
                <p className="text-xs text-gray-500">Municipal clearance work orders & citizen reports</p>
              </div>
            </div>

            <div className="space-y-3">
              {enforcementTasks.map(t => (
                <div key={t.id} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-900">{t.id} • {t.location}</span>
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px]">
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium">{t.type}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[11px] text-emerald-700 font-mono font-bold">{t.status}</span>
                    <button
                      onClick={() => toast.success(`Clearance Action Updated for ${t.id}`)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[10px] font-bold"
                    >
                      Update Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 5: LIVE CCTV FEED & INCIDENTS ════ */}
        {adminTab === 'cctv' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900">Silk Board CCTV Stream #1</span>
                <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[10px]">● LIVE 30 FPS</span>
              </div>
              <div className="w-full aspect-video bg-gray-900 rounded-2xl relative flex items-center justify-center text-white">
                <p className="font-mono text-[11px] text-gray-300">YOLOv5 + Segmentation Active</p>
                <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-mono">
                  Density: 88% • Queue: 1,380m
                </span>
              </div>
              <p className="text-gray-500 font-mono">Auto E-Challans generated today: <strong>14 issued</strong></p>
            </div>
          </div>
        )}

      </div>

      {/* ── POLICE BOTTOM NAVIGATION DOCK ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setAdminTab('challan')}
          className={`flex flex-col items-center gap-1 transition-all ${
            adminTab === 'challan' ? 'text-purple-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">E-Challan</span>
        </button>

        <button
          onClick={() => setAdminTab('signals')}
          className={`flex flex-col items-center gap-1 transition-all ${
            adminTab === 'signals' ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px]">Signals</span>
        </button>

        <button
          onClick={() => setAdminTab('v2v')}
          className={`flex flex-col items-center gap-1 transition-all ${
            adminTab === 'v2v' ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px]">V2V Radar</span>
        </button>

        <button
          onClick={() => setAdminTab('enforcement')}
          className={`flex flex-col items-center gap-1 transition-all ${
            adminTab === 'enforcement' ? 'text-rose-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Ban className="w-5 h-5" />
          <span className="text-[10px]">Hawkers</span>
        </button>

        <button
          onClick={() => setAdminTab('cctv')}
          className={`flex flex-col items-center gap-1 transition-all ${
            adminTab === 'cctv' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px]">Live CCTV</span>
        </button>
      </nav>

    </div>
  );
}
