import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MobileFieldApp from '../components/mobile/MobileFieldApp';
import { Monitor, Smartphone, ArrowLeft, ExternalLink } from 'lucide-react';

export default function MobileAppPage() {
  const [deviceFrame, setDeviceFrame] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100 flex flex-col justify-between items-center p-0 sm:p-6 text-gray-800">
      
      {/* Top Bar for Desktop Viewers */}
      <div className="w-full max-w-4xl mb-4 hidden sm:flex items-center justify-between bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-blue-600 transition-all bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Web Dashboard
          </Link>
          <span className="text-xs font-mono text-gray-400">|</span>
          <span className="text-xs font-bold text-gray-900">📱 Mobile Field & Citizen Application View</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            {deviceFrame ? 'Device Frame: ON' : 'Device Frame: OFF'}
          </button>
          
          <Link
            to="/citizen"
            className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all"
          >
            <Monitor className="w-4 h-4" />
            Citizen Web Portal
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className={deviceFrame ? "w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-gray-300 overflow-hidden" : "w-full max-w-md bg-white shadow-lg"}>
        <MobileFieldApp />
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-xs text-gray-500 font-mono hidden sm:block">
        SAMVED + UrbanFlow Smart City Mobile Client • Light Theme
      </div>

    </div>
  );
}
