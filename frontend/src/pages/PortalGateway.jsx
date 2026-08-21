import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Monitor, 
  Smartphone, 
  Shield, 
  User, 
  Car, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Radio,
  Zap,
  Activity,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function PortalGateway({ user }) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleLaunchWeb = (role) => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/citizen');
    } else {
      navigate('/login');
    }
  };

  const handleLaunchMobile = (role) => {
    localStorage.setItem('mobile_role_intent', role);
    navigate('/mobile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-100 flex flex-col justify-between p-4 sm:p-8 text-gray-800 font-sans">
      
      {/* ── TOP HEADER ── */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
            UF
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              SAMVED + UrbanFlow
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Smart Traffic, V2V Autonomous Safety & AI City Infrastructure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            All 14 Multi-Agent Nodes Live
          </span>
        </div>
      </header>

      {/* ── MAIN HERO SELECTION GATEWAY ── */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 sm:py-12 space-y-8">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="bg-blue-100 text-blue-800 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider border border-blue-200">
            Welcome to Smart City Mobility
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            Select Your Preferred Platform Experience
          </h2>
          <p className="text-gray-600 text-sm sm:text-base font-medium">
            Choose between the full desktop command center or the lightweight, touch-optimized mobile field application.
          </p>
        </div>

        {/* Two Grand Options: Web Portal vs Mobile App */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
          
          {/* OPTION 1: FULL DESKTOP WEB PORTAL */}
          <div 
            onMouseEnter={() => setHoveredCard('web')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`bg-white rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-xl ${
              hoveredCard === 'web' ? 'border-blue-500 ring-4 ring-blue-500/10 transform -translate-y-1' : 'border-gray-200'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Monitor className="w-8 h-8" />
                </div>
                <span className="text-xs font-black font-mono px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200 uppercase">
                  Desktop & Tablet View
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900">Desktop Web Command Portal</h3>
                <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">
                  Full-featured traffic management workstation with live multi-camera feeds, Bangalore geospatial heatmaps, 12-agent AI orchestrator, and daily analytics.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>12-Agent Matrix & Live Consensus Trace</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Bangalore Geospatial Map & Signal Actuation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>CCTV Video Segmentation & Automatic E-Challans</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Smart Parking Booking & Citizen Dashboard</span>
                </div>
              </div>
            </div>

            {/* Actions for Web */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleLaunchWeb('admin')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Launch Web Portal (Admin / Operator)
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/citizen')}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl text-xs transition-all border border-gray-200 flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Open Citizen Web Portal
              </button>
            </div>
          </div>

          {/* OPTION 2: SMART CITY MOBILE APPLICATION */}
          <div 
            onMouseEnter={() => setHoveredCard('mobile')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`bg-white rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-xl ${
              hoveredCard === 'mobile' ? 'border-emerald-500 ring-4 ring-emerald-500/10 transform -translate-y-1' : 'border-gray-200'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Smartphone className="w-8 h-8" />
                </div>
                <span className="text-xs font-black font-mono px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 uppercase">
                  Mobile Responsive PWA
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900">Smart City Mobile Application</h3>
                <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">
                  Lightweight, touch-friendly mobile application for field police officers, in-vehicle drivers, and pedestrians with full feature parity.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Police Authority On-Spot E-Challan Issuer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pedestrian Walk Assistant & +25s Signal Hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Driver In-Vehicle OBU HUD & Collision Radar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Citizen Hawkers / Parking / Noise Issue Reporting</span>
                </div>
              </div>
            </div>

            {/* Actions for Mobile */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleLaunchMobile('officer')}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Launch Mobile App (Police / Admin)
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleLaunchMobile('pedestrian')}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl text-xs transition-all border border-gray-200 flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                Launch Mobile App (Citizen / Pedestrian)
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* ── FOOTER BAR ── */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 border-t border-gray-200/80 text-xs text-gray-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>SAMVED + UrbanFlow Smart Traffic & V2V System</span>
        <span>Bengaluru Smart City Corridors • Clean Light Theme</span>
      </footer>

    </div>
  );
}
