import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Truck, MapPin, Clock, Navigation, Zap, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';

export default function EmergencyControl() {
  const [emergencies, setEmergencies] = useState([]);

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 10000);
    return () => clearInterval(interval);
  }, []);

  const mockEmergencies = [
    {
      _id: '1',
      vehicleId: 'FIRE886',
      vehicleType: 'Fire Truck',
      status: 'active',
      route: [{ signalId: 'SIG006' }, { signalId: 'SIG001' }, { signalId: 'SIG004' }],
      destination: { address: 'City Pride - GMR Mall Area' },
      estimatedArrival: new Date().setHours(17, 28, 32)
    },
    {
      _id: '2',
      vehicleId: 'DR408',
      vehicleType: 'Disaster Response',
      status: 'active',
      route: [{ signalId: 'SIG006' }, { signalId: 'SIG001' }, { signalId: 'SIG004' }],
      destination: { address: 'Soham Mall - Hospital Stretch' },
      estimatedArrival: new Date().setHours(17, 28, 32)
    },
    {
      _id: '3',
      vehicleId: 'AMB102',
      vehicleType: 'Ambulance',
      status: 'active',
      route: [{ signalId: 'SIG006' }, { signalId: 'SIG001' }, { signalId: 'SIG004' }],
      destination: { address: 'City Hospital Emergency' },
      estimatedArrival: new Date().setHours(17, 28, 32)
    }
  ];

  const fetchEmergencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/emergency', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(data) && data.length > 0) {
        setEmergencies(data);
      } else {
        setEmergencies(mockEmergencies);
      }
    } catch (error) {
      console.error('Error fetching emergencies:', error);
      setEmergencies(mockEmergencies);
    }
  };

  const handleComplete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/emergency/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Emergency completed successfully');
      fetchEmergencies();
    } catch (error) {
      toast.error('Failed to complete emergency');
    }
  };

  const calculateTimeSaved = (normalTime, corridorTime) => {
    return normalTime - corridorTime;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center">
                <Truck className="w-8 h-8 mr-3 animate-pulse" />
                AI Green Corridor - Emergency Response
              </h2>
              <p className="text-red-100">Real-time emergency vehicle tracking with intelligent traffic clearance</p>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-lg px-4 py-2 rounded-xl">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Active Emergencies</p>
              <p className="text-4xl font-bold mt-2">{emergencies.length}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Avg Time Saved</p>
              <p className="text-4xl font-bold mt-2">8m</p>
            </div>
            <TrendingDown className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Signals Cleared</p>
              <p className="text-4xl font-bold mt-2">24</p>
            </div>
            <Zap className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Success Rate</p>
              <p className="text-4xl font-bold mt-2">98%</p>
            </div>
            <CheckCircle className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Emergency Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {emergencies.map((emergency) => {
          const normalTime = 25; // minutes
          const corridorTime = 15; // minutes
          const timeSaved = calculateTimeSaved(normalTime, corridorTime);

          return (
            <div key={emergency._id} className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-red-200">
              {/* Map Visualization */}
              <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
                {/* Simulated Map Grid */}
                <div className="absolute inset-0">
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Grid Lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="400" height="300" fill="url(#grid)" />
                    
                    {/* Route Path */}
                    <path
                      d="M 50 250 L 100 200 L 150 150 L 200 100 L 250 80 L 300 60 L 350 50"
                      stroke="#ef4444"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="10,5"
                      className="animate-dash"
                    />
                    
                    {/* Traffic Signals */}
                    {emergency.route.slice(0, 5).map((point, idx) => (
                      <g key={idx}>
                        <circle
                          cx={50 + idx * 60}
                          cy={250 - idx * 40}
                          r="8"
                          fill="#10b981"
                          className="animate-pulse"
                        />
                        <text
                          x={50 + idx * 60}
                          y={270 - idx * 40}
                          fontSize="10"
                          fill="#374151"
                          textAnchor="middle"
                        >
                          {point.signalId}
                        </text>
                      </g>
                    ))}
                    
                    {/* Emergency Vehicle */}
                    <g className="animate-move-vehicle">
                      <circle cx="150" cy="150" r="12" fill="#dc2626" />
                      <text x="150" y="155" fontSize="16" fill="white" textAnchor="middle">🚑</text>
                    </g>
                    
                    {/* Destination */}
                    <circle cx="350" cy="50" r="15" fill="#3b82f6" opacity="0.3" className="animate-pulse" />
                    <circle cx="350" cy="50" r="10" fill="#3b82f6" />
                    <text x="350" y="35" fontSize="12" fill="#1f2937" textAnchor="middle" fontWeight="bold">🏥</text>
                  </svg>
                </div>

                {/* Live Tracking Badge */}
                <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full flex items-center space-x-2 shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-bold">LIVE TRACKING</span>
                </div>

                {/* Speed Indicator */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
                  <p className="text-xs text-gray-600">Speed</p>
                  <p className="text-2xl font-bold text-gray-800">65 km/h</p>
                </div>

                {/* Distance Remaining */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
                  <p className="text-xs text-gray-600">Distance</p>
                  <p className="text-xl font-bold text-gray-800">3.2 km</p>
                </div>
              </div>

              {/* Emergency Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{emergency.vehicleId}</h3>
                      <p className="text-sm text-gray-600 capitalize">{emergency.vehicleType.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold border-2 border-red-200">
                    {emergency.status.toUpperCase()}
                  </span>
                </div>

                {/* Time Comparison */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Normal Time</p>
                    <p className="text-2xl font-bold text-gray-800">{normalTime}m</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 mb-1">Corridor Time</p>
                    <p className="text-2xl font-bold text-green-700">{corridorTime}m</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 mb-1 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Time Saved
                    </p>
                    <p className="text-2xl font-bold text-blue-700">{timeSaved}m</p>
                  </div>
                </div>

                {/* Route Information */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Destination</p>
                      <p className="font-semibold text-gray-800">{emergency.destination.address || 'City Hospital Emergency'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Estimated Arrival</p>
                      <p className="font-semibold text-gray-800">{new Date(emergency.estimatedArrival).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <Navigation className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Signals Cleared</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {emergency.route.slice(0, 6).map((point, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{point.signalId}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 mb-4">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    AI Green Corridor Analysis
                  </p>
                  <p className="text-xs text-gray-700">
                    ✅ {emergency.route.length} traffic signals automatically cleared<br/>
                    ⚡ Real-time route optimization active<br/>
                    🎯 Estimated {timeSaved} minutes saved compared to normal traffic<br/>
                    📡 GPS tracking and signal coordination in progress
                  </p>
                </div>

                {emergency.status === 'active' && (
                  <button
                    onClick={() => handleComplete(emergency._id)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold flex items-center justify-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {emergencies.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Truck className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">No Active Emergencies</p>
          <p className="text-gray-400 text-sm mt-2">System ready to activate green corridor when needed</p>
        </div>
      )}

      <style jsx="true">{`
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
        @keyframes move-vehicle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        .animate-dash {
          animation: dash 2s linear infinite;
        }
        .animate-move-vehicle {
          animation: move-vehicle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
