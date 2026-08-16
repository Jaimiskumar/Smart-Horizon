import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ParkingBooking from '../components/citizen/ParkingBooking';
import MyBookings from '../components/citizen/MyBookings';
import MyFines from '../components/citizen/MyFines';
import ReportViolation from '../components/citizen/ReportViolation';
import ReportRoadIssue from '../components/citizen/ReportRoadIssue';
import RoadNews from '../components/citizen/RoadNews';
import TrafficMap from '../components/citizen/TrafficMap';
import { 
  ParkingCircle, 
  CreditCard, 
  AlertCircle, 
  LogOut, 
  User, 
  Menu, 
  X, 
  Camera,
  Construction,
  Megaphone,
  Map as MapIcon
} from 'lucide-react';

export default function CitizenDashboard({ user, onLogout }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('parking');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && path !== 'citizen') setActiveTab(path);
  }, [location]);

  const tabs = [
    { id: 'parking', label: 'Book Parking', icon: ParkingCircle, path: '/citizen/parking', color: 'blue' },
    { id: 'bookings', label: 'My Bookings', icon: User, path: '/citizen/bookings' },
    { id: 'fines', label: 'My Fines', icon: AlertCircle, path: '/citizen/fines' },
    { id: 'map', label: 'Live Traffic Map', icon: MapIcon, path: '/citizen/map' },
    { id: 'report', label: 'Report Violation', icon: Camera, path: '/citizen/report' },
    { id: 'road-issue', label: 'Report Issue', icon: Construction, path: '/citizen/road-issue' },
    { id: 'news', label: 'Road News', icon: Megaphone, path: '/citizen/news' }
  ];

  const getColorClasses = (color, isActive) => {
    const colors = {
      blue: isActive ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50',
      green: isActive ? 'bg-green-600 text-white' : 'text-green-600 hover:bg-green-50',
      orange: isActive ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-50'
    };
    return colors[color];
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <ParkingCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-tighter">
                Solapur Smart City
              </h1>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <tab.icon className={`w-5 h-5 mr-3 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
              {tab.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 z-30">
          <div className="px-4 h-16 flex items-center justify-between lg:justify-end">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                  {user.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">Citizen</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all shadow-md transform hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 relative">
          <div className="animate-fade-in max-w-7xl mx-auto pb-20 lg:pb-0">
            <Routes>
              <Route path="/" element={<ParkingBooking user={user} />} />
              <Route path="/parking" element={<ParkingBooking user={user} />} />
              <Route path="/map" element={<TrafficMap />} />
              <Route path="/bookings" element={<MyBookings />} />
              <Route path="/fines" element={<MyFines />} />
              <Route path="/report" element={<ReportViolation />} />
              <Route path="/road-issue" element={<ReportRoadIssue />} />
              <Route path="/news" element={<RoadNews />} />
            </Routes>
          </div>
        </main>
      </div>

      <style jsx="true">{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
