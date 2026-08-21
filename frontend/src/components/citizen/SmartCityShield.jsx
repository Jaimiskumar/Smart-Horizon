import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { 
  User, 
  Shield, 
  AlertTriangle, 
  Volume2, 
  Wind, 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Send, 
  Activity, 
  Car, 
  Radio, 
  Sparkles, 
  Layers, 
  ThumbsUp, 
  TrendingUp, 
  Navigation,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

export default function SmartCityShield() {
  const [activeSection, setActiveSection] = useState('pedestrian'); // 'pedestrian' | 'pollution' | 'report' | 'tickets'
  
  // ── 1. Pedestrian Crossing State ──
  const [pedestrianStatus, setPedestrianStatus] = useState({
    safeToCross: false,
    crosswalkName: 'Silk Board J2 Crosswalk',
    approachingVehicle: 'VEH-021 (Sedan • 54 km/h)',
    distanceToVehicle: 8.5,
    timer: 18,
    isHeld: false,
    risk: 'HIGH'
  });

  // ── 2. Smart Corridor Pollution & Acoustic Honking Data ──
  const [corridors, setCorridors] = useState([
    {
      id: 'silk-board',
      name: 'Silk Board Central Junction',
      congestion: 'CRITICAL',
      density: 88,
      noise_db: 89.2,
      honking_index: 'HIGH (14 honks/min)',
      aqi: 184,
      aqi_status: 'UNHEALTHY',
      intervention: 'Anti-Idling Green Wave & Honk-Free Advisory Active'
    },
    {
      id: 'kr-puram',
      name: 'KR Puram Hanging Bridge',
      congestion: 'HIGH',
      density: 82,
      noise_db: 84.5,
      honking_index: 'MODERATE (9 honks/min)',
      aqi: 162,
      aqi_status: 'MODERATE',
      intervention: 'Dynamic Signal Synchronization'
    },
    {
      id: 'ecity',
      name: 'Electronic City Tollgate',
      congestion: 'MEDIUM',
      density: 64,
      noise_db: 74.0,
      honking_index: 'LOW (3 honks/min)',
      aqi: 110,
      aqi_status: 'MODERATE',
      intervention: 'Standard Flow Maintenance'
    },
    {
      id: 'hebbal',
      name: 'Hebbal Flyover Corridor',
      congestion: 'FLOWING',
      density: 52,
      noise_db: 68.5,
      honking_index: 'LOW (2 honks/min)',
      aqi: 88,
      aqi_status: 'GOOD',
      intervention: 'Optimum Green Wave Active'
    }
  ]);

  // ── 3. Citizen Report State ──
  const [reportForm, setReportForm] = useState({
    category: 'hawkers_encroachment', // 'hawkers_encroachment' | 'illegal_parking' | 'excessive_honking' | 'pothole' | 'accident'
    location: 'Silk Board Junction, Bengaluru',
    description: '',
    severity: 'high'
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState([
    {
      id: 'CIT-BLR-8492',
      category: 'Hawkers Encroaching Pedestrian Sidewalk',
      location: 'Silk Board J2 Crosswalk',
      timestamp: '10 mins ago',
      status: 'AI Validated • Municipal Action Dispatched',
      badgeColor: 'emerald'
    },
    {
      id: 'CIT-BLR-8421',
      category: 'Illegal Commercial Parking on Shoulder',
      location: 'Madiwala Main Road',
      timestamp: '1 hour ago',
      status: 'Challan Issued • Tow Truck Notified',
      badgeColor: 'blue'
    },
    {
      id: 'CIT-BLR-8310',
      category: 'Excessive Honking & Idling Pollution',
      location: 'KR Puram Junction',
      timestamp: '3 hours ago',
      status: 'Resolved • Signal Cycle Adjusted',
      badgeColor: 'purple'
    }
  ]);

  const fileInputRef = useRef(null);

  // Socket.IO real-time sync for pedestrian signals & citizen reports
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });

    socket.on('pedestrian_risk_update', (data) => {
      setPedestrianStatus(p => ({
        ...p,
        risk: data.risk || 'HIGH',
        safeToCross: data.risk === 'LOW'
      }));
    });

    socket.on('traffic_signal_recommendation', (data) => {
      if (data.green_extension_sec) {
        setPedestrianStatus(p => ({
          ...p,
          safeToCross: true,
          timer: data.green_extension_sec,
          isHeld: true
        }));
        toast.success(`Pedestrian Walk Signal Extended by ${data.green_extension_sec}s!`);
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleRequestCrosswalkHold = () => {
    setPedestrianStatus(p => ({
      ...p,
      safeToCross: true,
      timer: 25,
      isHeld: true,
      risk: 'LOW'
    }));
    toast.success('Crosswalk Extension Request Sent! Signal held for 25s.');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setPhotoPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCitizenSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.description) {
      toast.error('Please enter a short description');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = `CIT-BLR-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket = {
        id: ticketId,
        category: reportForm.category.replace(/_/g, ' ').toUpperCase(),
        location: reportForm.location,
        timestamp: 'Just now',
        status: 'AI Validated • Dispatched to Field Team',
        badgeColor: 'emerald'
      };

      setMyTickets(prev => [newTicket, ...prev]);
      toast.success(`Report Submitted! Ticket ID: ${ticketId}`);
      setReportForm(p => ({ ...p, description: '' }));
      setPhotoPreview(null);
      setActiveSection('tickets');
    } catch (err) {
      toast.error(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* ── TOP HERO BANNER (LIGHT THEME) ── */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-6 sm:p-8 text-gray-900 shadow-sm border border-emerald-200 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                Smart City Citizen Assistant
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              Pedestrian Safety, Noise/Pollution Shield & Smart Reporting
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm font-medium mt-1">
              Active protection for pedestrians, live air & acoustic pollution monitoring, and 1-tap citizen grievance reporting.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-200 font-mono text-xs shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-emerald-700 font-bold">Smart City Shield Active</span>
          </div>
        </div>

        {/* Quick Nav Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-emerald-200/80 text-xs font-bold">
          <button
            onClick={() => setActiveSection('pedestrian')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSection === 'pedestrian' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            Pedestrian Crosswalk Shield
          </button>

          <button
            onClick={() => setActiveSection('pollution')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSection === 'pollution' ? 'bg-blue-600 text-white shadow-sm font-black' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Wind className="w-4 h-4" />
            Noise & Air Pollution Heatmap
          </button>

          <button
            onClick={() => setActiveSection('report')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSection === 'report' ? 'bg-purple-600 text-white shadow-sm font-black' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Report Issue (Hawkers/Parking/Honking)
          </button>

          <button
            onClick={() => setActiveSection('tickets')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSection === 'tickets' ? 'bg-indigo-600 text-white shadow-sm font-black' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            My Tracked Grievances ({myTickets.length})
          </button>
        </div>
      </div>

      {/* ── SECTION 1: PEDESTRIAN CROSSWALK SHIELD ── */}
      {activeSection === 'pedestrian' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Giant Crosswalk Status Box */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Live Pedestrian Crossing Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Connected to Roadside Unit (RSU-J2) Silk Board Crosswalk
              </p>
            </div>

            <div className={`p-8 rounded-3xl text-center border-2 transition-all ${
              pedestrianStatus.safeToCross
                ? 'bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-500/10'
                : 'bg-red-50 border-red-500 shadow-xl shadow-red-500/10'
            }`}>
              <span className={`text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider ${
                pedestrianStatus.safeToCross ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
              }`}>
                {pedestrianStatus.safeToCross ? '✓ SAFE TO CROSS NOW' : '⚠️ DO NOT CROSS • VEHICLE APPROACHING FAST'}
              </span>

              <div className="my-6">
                <p className="text-7xl font-black font-mono text-slate-900">
                  {pedestrianStatus.timer}
                </p>
                <p className="text-xs text-slate-500 font-mono uppercase mt-1">
                  {pedestrianStatus.safeToCross ? 'Seconds Walk Phase Remaining' : 'Signal Hold Countdown'}
                </p>
              </div>

              <div className="text-xs font-mono text-slate-700 pt-4 border-t border-slate-200/80 space-y-1">
                <p>Location: <strong>{pedestrianStatus.crosswalkName}</strong></p>
                <p>Approaching: <span className="text-red-600 font-bold">{pedestrianStatus.approachingVehicle}</span></p>
                <p>Distance: <strong>{pedestrianStatus.distanceToVehicle} meters</strong></p>
              </div>
            </div>

            {/* Hold Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-800">Need Extra Time to Cross?</p>
                <p className="text-[11px] text-slate-500">Elderly, disabled, children or heavy crowd crossing assistance</p>
              </div>

              <button
                onClick={handleRequestCrosswalkHold}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                🚶 Request Extended Walk Phase (+25s)
              </button>
            </div>
          </div>

          {/* Right Col: Crosswalk Safety Features */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-1">Smart Safety Shield Guidelines</h3>
              <p className="text-xs text-slate-500">How the AI protects pedestrians at smart intersections</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                <p className="font-bold text-blue-900">1. Predictive Braking Warning</p>
                <p className="text-blue-700 text-[11px]">When high vehicle speeds (&gt;45 km/h) are detected near crosswalks, RSU units automatically hold the vehicle green phase.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <p className="font-bold text-purple-900">2. Night Crosswalk Illumination</p>
                <p className="text-purple-700 text-[11px]">Edge sensors detect waiting pedestrians in low light and trigger dynamic high-intensity crosswalk illumination.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-900">3. Direct V2V In-Vehicle Warning</p>
                <p className="text-emerald-700 text-[11px]">Approaching connected vehicles receive dashboard Heads-Up Alerts to yield to pedestrians.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-400 font-mono text-center">
              Powered by SAMVED + UrbanFlow Edge RSU
            </div>
          </div>

        </div>
      )}

      {/* ── SECTION 2: NOISE & AIR POLLUTION HEATMAP ── */}
      {activeSection === 'pollution' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Wind className="w-5 h-5 text-blue-600" />
              Smart Corridor Acoustic Noise & Environmental Pollution Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High congestion triggers excessive honking and tailpipe emissions. The AI dynamically harmonizes signals to dissipate queues.
            </p>

            {/* Corridor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {corridors.map(c => (
                <div key={c.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800">{c.name}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      c.congestion === 'CRITICAL' ? 'bg-red-100 text-red-700' : (c.congestion === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                    }`}>
                      {c.congestion} CONGESTION
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200">
                      <p className="text-[10px] text-slate-400">NOISE LEVEL</p>
                      <p className={`text-base font-black ${c.noise_db > 80 ? 'text-red-600' : 'text-slate-800'}`}>{c.noise_db} dB</p>
                      <p className="text-[9px] text-slate-500">{c.honking_index}</p>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200">
                      <p className="text-[10px] text-slate-400">AIR QUALITY (AQI)</p>
                      <p className={`text-base font-black ${c.aqi > 150 ? 'text-red-600' : 'text-emerald-600'}`}>{c.aqi}</p>
                      <p className="text-[9px] text-slate-500">{c.aqi_status}</p>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200">
                      <p className="text-[10px] text-slate-400">VEHICLE DENSITY</p>
                      <p className="text-base font-black text-slate-800">{c.density}%</p>
                      <p className="text-[9px] text-slate-500">Road Capacity</p>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-mono text-indigo-900">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase">AI Emission & Noise Intervention:</p>
                    <p className="font-semibold mt-0.5">{c.intervention}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: CITIZEN REPORTING HUB ── */}
      {activeSection === 'report' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              Citizen Smart Issue Reporter
            </h2>
            <p className="text-xs text-slate-500">
              Report hawkers encroaching sidewalks, illegal parking, excessive honking, broken signals, or potholes for instant AI validation and field dispatch.
            </p>
          </div>

          <form onSubmit={handleCitizenSubmitReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 font-mono">Issue Category</label>
                <select
                  value={reportForm.category}
                  onChange={e => setReportForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                >
                  <option value="hawkers_encroachment">🏪 Hawkers & Street Encroachment on Walkways</option>
                  <option value="illegal_parking">🅿️ Illegal Parking in No-Parking / Shoulder Zone</option>
                  <option value="excessive_honking">📢 Excessive Honking & Noise Pollution Zone</option>
                  <option value="broken_signal">🚦 Defective / Broken Traffic Signal</option>
                  <option value="pothole">🚧 Dangerous Pothole / Road Damage</option>
                  <option value="accident">🚨 Traffic Accident / Vehicle Stalled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 font-mono">Corridor / Location Landmark</label>
                <input
                  type="text"
                  value={reportForm.location}
                  onChange={e => setReportForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                  placeholder="e.g. Silk Board J2 Crosswalk, Bengaluru"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 font-mono">Description / Details</label>
              <textarea
                rows={3}
                value={reportForm.description}
                onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800"
                placeholder="Describe what you observed (e.g., 3 vendor stalls blocking crosswalk entry causing pedestrian risk)..."
              />
            </div>

            {/* Photo Upload Box */}
            <div>
              <label className="text-xs font-bold text-slate-700 font-mono">Attach Photo Proof (Optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="mt-1.5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {photoPreview ? 'Change Photo' : 'Upload / Capture Photo'}
                </button>

                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-300" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting & Dispatching...' : '🚀 Submit Smart City Report'}
            </button>
          </form>
        </div>
      )}

      {/* ── SECTION 4: MY TRACKED GRIEVANCES ── */}
      {activeSection === 'tickets' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Tracked Citizen Grievances & Municipal Actions
              </h2>
              <p className="text-xs text-slate-500">Live lifecycle status of your submitted reports</p>
            </div>

            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {myTickets.length} Active Tickets
            </span>
          </div>

          <div className="space-y-3">
            {myTickets.map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-600 font-mono">{t.id}</span>
                    <span className="text-xs font-bold text-slate-800">• {t.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Location: {t.location} • Submitted: {t.timestamp}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                    t.badgeColor === 'emerald' ? 'bg-emerald-100 text-emerald-800' : (t.badgeColor === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800')
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
