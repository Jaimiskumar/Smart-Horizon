import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      if (onLogin) onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/auth/register', { name, email, password, vehicleNumber });
      if (onLogin) onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen font-sans">
      
      {/* Left Side: Dark Navy Panel (Hidden on very small screens, visible md+) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0F172A] p-12 text-white relative border-r border-slate-800">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="flex flex-col flex-1 justify-center max-w-md mx-auto relative z-10 w-full">
          {/* Traffic Signal SVG Icon */}
          <svg className="w-12 h-32 mb-6" viewBox="0 0 40 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="100" rx="20" fill="#1E293B"/>
            <circle cx="20" cy="24" r="12" fill="#EF4444"/>
            <circle cx="20" cy="50" r="12" fill="#F59E0B"/>
            <circle cx="20" cy="76" r="12" fill="#10B981"/>
          </svg>
          
          <h1 className="text-4xl font-bold tracking-tight mb-2">TrafficGrid</h1>
          <p className="text-slate-400 text-lg mb-12">Smart City Traffic & Parking Management</p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚦</span>
              <span className="text-slate-200 font-medium">Adaptive Signal Control</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🅿️</span>
              <span className="text-slate-200 font-medium">Smart Parking Management</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">📊</span>
              <span className="text-slate-200 font-medium">Real-time Analytics</span>
            </div>
          </div>
        </div>

        <div className="mt-auto relative z-10 max-w-md mx-auto w-full text-slate-500 text-sm">
          Solapur Municipal Corporation
        </div>
      </div>

      {/* Right Side: White Panel Form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-[#F8FAFC] md:bg-white p-6 relative">
        <div className="w-full max-w-[400px] bg-white md:bg-transparent p-8 md:p-0 rounded-[2.5rem] shadow-2xl shadow-slate-200 md:shadow-none border border-slate-100 md:border-none">
          
          {/* Mobile Only Logo */}
          <div className="flex md:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg">
                <div className="flex flex-col gap-0.5">
                   <div className="w-4 h-1.5 rounded-full bg-red-500"></div>
                   <div className="w-4 h-1.5 rounded-full bg-amber-500"></div>
                   <div className="w-4 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
            </div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tighter">TrafficGrid</h1>
          </div>
          {isRegister ? (
            /* Register Form View */
            <div className="animate-fade-in">
              <button 
                onClick={() => setIsRegister(false)}
                className="flex items-center text-[#0F172A] hover:text-slate-600 mb-6 text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Login
              </button>
              
              <p className="text-xs text-gray-400 font-bold tracking-wider mb-2">CITIZEN PORTAL</p>
              <h2 className="text-[28px] font-bold text-[#0F172A] leading-tight mb-2">Create Account</h2>
              <p className="text-gray-500 text-sm mb-8">Register to access municipal services.</p>

              {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <span className="w-5 h-5 flex items-center justify-center font-bold text-gray-400">P</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Vehicle Number (e.g. MH-12-AB-3456)"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-[#0F172A] text-white text-[14px] font-semibold py-3 rounded-[12px] hover:bg-slate-800 transition-colors">
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Login Form View */
            <div className="animate-fade-in">
              <p className="text-xs text-gray-400 font-bold tracking-wider mb-2">CITIZEN & AUTHORITY PORTAL</p>
              <h2 className="text-[28px] font-bold text-[#0F172A] leading-tight mb-2">Welcome Back</h2>
              <p className="text-gray-500 text-sm mb-8">Sign in to your account</p>

              {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-3 py-[10px] border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>

                <div className="flex justify-end pt-1 pb-3">
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-[#0F172A] hover:underline">Forgot password?</a>
                </div>

                <button type="submit" className="w-full bg-[#0F172A] text-white text-[14px] font-semibold py-3 rounded-[12px] hover:bg-slate-800 transition-colors">
                  Sign In
                </button>
              </form>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setIsRegister(true)}
                  className="text-sm font-semibold text-[#0F172A] hover:underline transition-colors"
                >
                  New citizen? Register here
                </button>
              </div>

              <div className="mt-10 bg-[#F8FAFC] rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider text-center">Demo Credentials</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center text-xs text-gray-600">
                  <div className="flex-1 bg-white p-3 rounded border border-gray-200 shadow-sm text-center">
                    <p className="font-bold text-[#0F172A] mb-1">Admin</p>
                    <p>admin@traffic.gov</p>
                    <p className="text-gray-400 mt-1">Pass: admin123</p>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded border border-gray-200 shadow-sm text-center">
                    <p className="font-bold text-[#0F172A] mb-1">Citizen</p>
                    <p>citizen@example.com</p>
                    <p className="text-gray-400 mt-1">Pass: citizen123</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx="true">{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
