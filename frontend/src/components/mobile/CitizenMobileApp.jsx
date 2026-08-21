import React, { useState, useEffect } from 'react';
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
  Map as MapIcon
} from 'lucide-react';

export default function CitizenMobileApp({ onSwitchToAdmin }) {
  // Bottom Navigation Tabs for Citizen
  const [citizenTab, setCitizenTab] = useState('pedestrian'); // 'pedestrian' | 'parking' | 'driver' | 'report' | 'fines'

  // ── Pedestrian Crosswalk State ──
  const [pedestrianState, setPedestrianState] = useState({
    safeToCross: false,
    crosswalkName: 'Silk Board J2 Crosswalk',
    approachingVehicle: 'VEH-021 (Sedan • 54 km/h)',
    distance: 8.5,
    timer: 18,
    isHeld: false
  });

  // ── Smart Parking State ──
  const [parkingLots, setParkingLots] = useState([
    { id: 'LOT-01', name: 'Silk Board Multi-Level Plaza', total: 120, available: 34, rate: '₹30/hr', distance: '120m', zone: 'Zone A' },
    { id: 'LOT-02', name: 'Madiwala Metro Parking', total: 80, available: 14, rate: '₹25/hr', distance: '380m', zone: 'Zone B' },
    { id: 'LOT-03', name: 'Koramangala 5th Block Parking', total: 150, available: 42, rate: '₹35/hr', distance: '850m', zone: 'Zone A' }
  ]);
  const [bookedSlot, setBookedSlot] = useState(null);

  // ── Driver In-Vehicle State ──
  const [driverSpeed, setDriverSpeed] = useState(48);
  const [v2vAdvisory, setV2vAdvisory] = useState({
    active: true,
    title: '⚠️ VEH-021 Hard Braking Ahead',
    advisorySpeed: 20,
    suggestedLane: 'Lane 2 (Shift Right)',
    severity: 'CRITICAL'
  });

  // ── Citizen Grievance Reporting State ──
  const [reportForm, setReportForm] = useState({
    category: 'hawkers_encroachment',
    location: 'Silk Board J2 Crosswalk, Bengaluru',
    description: ''
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [trackedTickets, setTrackedTickets] = useState([
    { id: 'CIT-BLR-8492', category: 'Hawkers on Crosswalk', status: 'Clearance Dispatched', time: '10m ago' },
    { id: 'CIT-BLR-8310', category: 'Excessive Honking Noise', status: 'Resolved (Signal Adjusted)', time: '2h ago' }
  ]);

  // ── My Fines State ──
  const [myFines, setMyFines] = useState([
    { id: 'CHN-2026-94821', vehicle: 'KA-01-MJ-4821', violation: 'Over-Speeding (68km/h)', amount: 1000, status: 'UNPAID' }
  ]);

  // Socket.IO real-time sync for pedestrian signals
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });

    socket.on('traffic_signal_recommendation', data => {
      setPedestrianState(p => ({
        ...p,
        safeToCross: true,
        timer: data.green_extension_sec || 25,
        isHeld: true
      }));
      toast.success('Crosswalk Signal Extended: Safe to Cross!');
    });

    socket.on('accident_detected', data => {
      setV2vAdvisory({
        active: true,
        title: '🚨 Accident Detected Ahead in 120M',
        advisorySpeed: 15,
        suggestedLane: 'Shift Right Immediately',
        severity: 'CRITICAL'
      });
      setPedestrianState(p => ({ ...p, safeToCross: false, timer: 24 }));
      toast.error('Driver Alert: Accident Ahead in 120M!');
    });

    return () => socket.disconnect();
  }, []);

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

  const handleSendReport = (e) => {
    e.preventDefault();
    if (!reportForm.description) {
      toast.error('Please enter a description');
      return;
    }

    setIsSubmittingReport(true);
    setTimeout(() => {
      const ticketId = `CIT-BLR-${Math.floor(1000 + Math.random() * 9000)}`;
      setTrackedTickets(prev => [
        { id: ticketId, category: reportForm.category.replace(/_/g, ' ').toUpperCase(), status: 'AI Validated • Dispatched', time: 'Just now' },
        ...prev
      ]);
      toast.success(`Grievance Reported! Ticket ID: ${ticketId}`);
      setReportForm(p => ({ ...p, description: '' }));
      setIsSubmittingReport(false);
    }, 500);
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-gray-50 text-gray-800 pb-20">
      
      {/* ── CITIZEN APP HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-black tracking-tight uppercase">Citizen Smart Mobility</h1>
                <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                  BENGALURU
                </span>
              </div>
              <p className="text-[10px] text-emerald-100 font-mono">Pedestrian, Driver & Parking Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1 text-[10px] font-bold bg-black/20 hover:bg-black/30 text-white px-2.5 py-1 rounded-lg border border-white/20 transition-all"
            >
              <Shield className="w-3 h-3 text-emerald-200" />
              Police Login
            </button>
          </div>
        </div>
      </div>

      {/* ── CITIZEN SCREEN CONTENT ── */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* ════ TAB 1: PEDESTRIAN CROSSWALK SHIELD ════ */}
        {citizenTab === 'pedestrian' && (
          <div className="space-y-4 animate-fade-in">
            {/* Crosswalk Safety Box */}
            <div className={`rounded-3xl p-6 text-center border-2 transition-all shadow-sm ${
              pedestrianState.safeToCross 
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950' 
                : 'bg-red-50 border-red-400 text-red-950'
            }`}>
              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                pedestrianState.safeToCross ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
              }`}>
                {pedestrianState.safeToCross ? '✓ SAFE TO CROSS NOW' : '⚠️ DO NOT CROSS • VEHICLE APPROACHING'}
              </span>

              <div className="my-5">
                <p className="text-6xl font-black font-mono text-gray-900">
                  {pedestrianState.timer}
                </p>
                <p className="text-xs text-gray-500 font-mono uppercase mt-1">
                  {pedestrianState.safeToCross ? 'Seconds Walk Phase Remaining' : 'Signal Hold Timer'}
                </p>
              </div>

              <div className="text-xs font-mono text-gray-700 pt-3 border-t border-gray-200/80 space-y-1">
                <p>Location: <strong>{pedestrianState.crosswalkName}</strong></p>
                <p>Approaching: <span className="text-red-600 font-bold">{pedestrianState.approachingVehicle}</span></p>
              </div>
            </div>

            {/* Hold Signal Button */}
            <button
              onClick={handleRequestHold}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Request Pedestrian Walk Signal (+25s)
            </button>

            {/* Environmental Quality Meter */}
            <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-blue-600" />
                  Corridor Noise & Air Quality
                </span>
                <span className="text-red-700 bg-red-100 text-[10px] font-bold px-2 py-0.5 rounded">
                  High Congestion
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
                  <p className="text-[9px] text-gray-500">NOISE / HONKING</p>
                  <p className="text-base font-black text-red-600">89.2 dB</p>
                  <p className="text-[9px] text-gray-400">Honk-Free Zone Active</p>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
                  <p className="text-[9px] text-gray-500">AIR QUALITY (AQI)</p>
                  <p className="text-base font-black text-amber-600">184 AQI</p>
                  <p className="text-[9px] text-gray-400">PM2.5 Elevated</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 2: SMART PARKING RESERVATION ════ */}
        {citizenTab === 'parking' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900">Find & Reserve Parking</h2>
                <p className="text-xs text-gray-500">Guaranteed slots with instant QR entry pass</p>
              </div>
            </div>

            {/* Parking Lots */}
            <div className="space-y-3">
              {parkingLots.map(lot => (
                <div key={lot.id} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-gray-900">{lot.name}</h3>
                      <p className="text-[10px] text-gray-500 font-mono">{lot.distance} away • {lot.zone}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {lot.available} Free
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-800 font-mono">{lot.rate}</span>
                    <button
                      onClick={() => handleBookParking(lot)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* QR Pass Card */}
            {bookedSlot && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 text-center space-y-3 shadow-md">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                  ✓ Slot Reserved
                </span>
                <p className="text-lg font-black text-emerald-950">{bookedSlot.slot}</p>
                <p className="text-xs text-gray-700 font-mono">{bookedSlot.lotName}</p>
                <div className="w-24 h-24 mx-auto bg-white p-2 rounded-2xl border border-emerald-300 flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-gray-900" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono">Scan QR at Entry Barrier</p>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 3: DRIVER IN-VEHICLE OBU HUD ════ */}
        {citizenTab === 'driver' && (
          <div className="space-y-4 animate-fade-in">
            {/* Speed & Heading */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 flex items-center justify-between text-center shadow-sm">
              <div>
                <p className="text-[9px] uppercase font-bold text-gray-500 font-mono">Current Speed</p>
                <p className="text-3xl font-black font-mono text-gray-900 mt-0.5">{driverSpeed} <span className="text-xs font-sans text-gray-400">km/h</span></p>
              </div>

              <div className="h-10 w-px bg-gray-200"></div>

              <div>
                <p className="text-[9px] uppercase font-bold text-gray-500 font-mono">Advisory Speed</p>
                <p className="text-2xl font-black font-mono text-amber-600 mt-0.5">{v2vAdvisory.advisorySpeed} <span className="text-xs font-sans text-gray-400">km/h</span></p>
              </div>

              <div className="h-10 w-px bg-gray-200"></div>

              <div>
                <p className="text-[9px] uppercase font-bold text-gray-500 font-mono">Heading</p>
                <p className="text-base font-bold font-mono text-gray-700 mt-1">175° S</p>
              </div>
            </div>

            {/* V2V Emergency Braking Alert */}
            {v2vAdvisory.active && (
              <div className="p-4 rounded-3xl bg-red-50 border-2 border-red-400 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-700 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    V2V In-Vehicle Warning
                  </span>
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded">
                    CRITICAL
                  </span>
                </div>
                <h3 className="text-sm font-black text-red-950">{v2vAdvisory.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-red-200">
                  <div className="bg-white p-2 rounded-xl border border-red-200">
                    <p className="text-[9px] text-gray-500">ADVISORY</p>
                    <p className="text-xs font-bold text-gray-900">&lt; {v2vAdvisory.advisorySpeed} km/h</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-red-200">
                    <p className="text-[9px] text-gray-500">LANE ACTION</p>
                    <p className="text-xs font-bold text-amber-700">{v2vAdvisory.suggestedLane}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Honk-Free Zone Card */}
            <div className="p-3.5 bg-white rounded-2xl border border-gray-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>HONK-FREE SILENT CORRIDOR</span>
              </div>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
            </div>
          </div>
        )}

        {/* ════ TAB 4: CITIZEN GRIEVANCE & REPORTING ════ */}
        {citizenTab === 'report' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-600" />
                Report Hawkers, Illegal Parking & Road Issues
              </h2>
              <p className="text-xs text-gray-500">Fast AI validation and direct municipal field dispatch</p>
            </div>

            <form onSubmit={handleSendReport} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 font-mono">Issue Category</label>
                <select
                  value={reportForm.category}
                  onChange={e => setReportForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold"
                >
                  <option value="hawkers_encroachment">🏪 Hawkers Blocking Sidewalk</option>
                  <option value="illegal_parking">🅿️ Illegal Parking on Road</option>
                  <option value="excessive_honking">📢 Excessive Noise & Honking</option>
                  <option value="pothole">🚧 Dangerous Pothole</option>
                  <option value="accident">🚨 Traffic Accident / Breakdown</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 font-mono">Location Landmark</label>
                <input
                  type="text"
                  value={reportForm.location}
                  onChange={e => setReportForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 font-mono">Description</label>
                <input
                  type="text"
                  value={reportForm.description}
                  onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what you observed..."
                  className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all active:scale-95"
              >
                {isSubmittingReport ? 'Sending...' : '🚀 Submit Report to City Control'}
              </button>
            </form>

            {/* Tracked Tickets */}
            <div className="bg-white rounded-3xl p-4 border border-gray-200 space-y-2 text-xs shadow-sm">
              <span className="font-black text-gray-800">Tracked Grievances</span>
              {trackedTickets.map((t, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{t.id} • {t.category}</p>
                    <p className="text-[10px] text-gray-500">{t.time}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 5: MY FINES & PAYMENTS ════ */}
        {citizenTab === 'fines' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                My Vehicle E-Challans & Fines
              </h2>
              <p className="text-xs text-gray-500">Pay traffic violation penalties online</p>
            </div>

            <div className="space-y-3">
              {myFines.map((f, i) => (
                <div key={i} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-700 font-mono">{f.id}</span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {f.status}
                    </span>
                  </div>
                  <div className="text-gray-800 font-mono space-y-1">
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
                      f.status === 'PAID' ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
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

      {/* ── CITIZEN BOTTOM NAVIGATION DOCK ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setCitizenTab('pedestrian')}
          className={`flex flex-col items-center gap-1 transition-all ${
            citizenTab === 'pedestrian' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Pedestrian</span>
        </button>

        <button
          onClick={() => setCitizenTab('parking')}
          className={`flex flex-col items-center gap-1 transition-all ${
            citizenTab === 'parking' ? 'text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ParkingCircle className="w-5 h-5" />
          <span className="text-[10px]">Parking</span>
        </button>

        <button
          onClick={() => setCitizenTab('driver')}
          className={`flex flex-col items-center gap-1 transition-all ${
            citizenTab === 'driver' ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Car className="w-5 h-5" />
          <span className="text-[10px]">Driver OBU</span>
        </button>

        <button
          onClick={() => setCitizenTab('report')}
          className={`flex flex-col items-center gap-1 transition-all ${
            citizenTab === 'report' ? 'text-purple-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px]">Report</span>
        </button>

        <button
          onClick={() => setCitizenTab('fines')}
          className={`flex flex-col items-center gap-1 transition-all ${
            citizenTab === 'fines' ? 'text-indigo-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px]">Fines</span>
        </button>
      </nav>

    </div>
  );
}
