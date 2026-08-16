import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  MapPin, 
  IndianRupee,
  Clock,
  Filter,
  Activity,
  ParkingCircle,
  LayoutGrid,
  ShieldAlert,
  Construction,
  Car
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyReports() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, [date]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin-reports/daily-stats?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (type = 'All') => {
    if (!data) return;

    let headers = ['Category', 'Type/ID', 'Amount', 'Status', 'Location'];
    let rows = [];

    if (type === 'All' || type === 'Challans') {
      data.details.fines.forEach(f => rows.push(['E-Challan', f.id, f.amount, f.status, f.location || 'Solapur']));
    }
    if (type === 'All' || type === 'Parking') {
      data.details.bookings.forEach(b => rows.push(['Parking', b.id, b.amount, b.status, b.spot]));
    }
    if (type === 'All' || type === 'Issues') {
      data.details.roadIssues.forEach(i => rows.push(['Citizen Report', i.id, '-', i.status, i.location]));
    }
    if (type === 'All' || type === 'Violations') {
      data.details.illegalParkings.forEach(p => rows.push(['Illegal Parking', p.id, '-', 'Detected', p.location]));
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Solapur_${type}_Report_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${type} report downloaded`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, color: 'blue' },
    { id: 'challans', label: 'E-Challans', icon: FileText, color: 'blue' },
    { id: 'parking', label: 'Parking Revenue', icon: ParkingCircle, color: 'emerald' },
    { id: 'violations', label: 'Illegal Parkings', icon: ShieldAlert, color: 'orange' },
    { id: 'issues', label: 'Road Issues', icon: Construction, color: 'purple' }
  ];

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Municipal <span className="text-blue-600">Intel</span></h2>
          <p className="text-slate-500 font-medium tracking-tight">Historical and real-time event aggregation portal.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <button 
            onClick={() => downloadCSV('All')}
            className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Export Master CSV</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-3xl shadow-sm border border-slate-50 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shrink-0 ${
              activeSubTab === tab.id 
              ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-200` 
              : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue', value: `₹${data?.stats.totalRevenue.toLocaleString() || 0}`, icon: IndianRupee, color: 'emerald', detail: `${data?.stats.finesRevenue} Fines + ${data?.stats.parkingRevenue} Parking` },
              { label: 'E-Challans', value: data?.stats.finesCount || 0, icon: FileText, color: 'blue', detail: 'Total violations issued' },
              { label: 'Illegal Parking', value: data?.stats.illegalParkingCount || 0, icon: AlertCircle, color: 'orange', detail: 'AI detection incidents' },
              { label: 'Citizen Reports', value: data?.stats.roadIssuesCount || 0, icon: Activity, color: 'purple', detail: 'Infrastructure issues filed' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-50 hover:shadow-xl hover:shadow-slate-100 transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-50 rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500 opacity-50`}></div>
                <div className={`w-12 h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex items-center justify-center mb-4 relative z-10`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1 relative z-10">{stat.label}</h4>
                <p className="text-3xl font-black text-slate-900 relative z-10">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 relative z-10">{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Area Revenue Breakdown */}
            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Area Revenue</h3>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="space-y-4">
                {data && Object.keys(data.areaStats).length > 0 ? Object.entries(data.areaStats).map(([area, stats]) => (
                  <div key={area} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-800">{area}</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-sm font-black text-emerald-600">₹{stats.revenue.toLocaleString()}</p></div>
                  </div>
                )) : <div className="text-center py-12 text-slate-300 italic font-bold">No data for this area</div>}
              </div>
            </div>

            {/* Daily Heatmap Placeholder / Info */}
            <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700"></div>
               <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white mb-2 leading-none">Smart City Optimization</h3>
                  <p className="text-blue-100 font-medium mb-8">Automatic grid rebalancing and AI deployment based on daily metrics.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/10 backdrop-blur-md p-6 rounded-[1.8rem] border border-white/10 text-white">
                        <Activity className="w-6 h-6 mb-4 text-emerald-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">System Uptime</p>
                        <p className="text-2xl font-black">99.98%</p>
                     </div>
                     <div className="bg-white/10 backdrop-blur-md p-6 rounded-[1.8rem] border border-white/10 text-white">
                        <ShieldAlert className="w-6 h-6 mb-4 text-orange-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Alert Latency</p>
                        <p className="text-2xl font-black">1.2s</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {/* Specific Tables */}
      {activeSubTab !== 'overview' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
            <div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">{tabs.find(t => t.id === activeSubTab).label}</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Detailed Event Log for {date}</p>
            </div>
            <button 
              onClick={() => downloadCSV(tabs.find(t => t.id === activeSubTab).label.split(' ')[0])}
              className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
            >
              <Download className="w-4 h-4" />
              Download Segment
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  {activeSubTab === 'challans' && ['Violation ID', 'Vehicle #', 'Amount', 'Type', 'Status'].map(h => <th key={h} className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>)}
                  {activeSubTab === 'parking' && ['Booking ID', 'Vehicle #', 'Zone', 'Amount', 'Status'].map(h => <th key={h} className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>)}
                  {activeSubTab === 'violations' && ['Detection ID', 'License Plate', 'Type', 'Location', 'Severity'].map(h => <th key={h} className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>)}
                  {activeSubTab === 'issues' && ['Report ID', 'Issue Type', 'Location', 'Summary', 'Status'].map(h => <th key={h} className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeSubTab === 'challans' && data.details.fines.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5 font-black text-xs">{f.id}</td>
                    <td className="px-8 py-5 font-bold text-xs">{f.vehicle || 'MH-13-XX-0000'}</td>
                    <td className="px-8 py-5 font-black text-xs text-blue-600">₹{f.amount}</td>
                    <td className="px-8 py-5 font-bold text-xs uppercase text-slate-400">{f.type}</td>
                    <td className="px-8 py-5"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">{f.status}</span></td>
                  </tr>
                ))}
                
                {activeSubTab === 'parking' && data.details.bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5 font-black text-xs">{b.id}</td>
                    <td className="px-8 py-5 font-bold text-xs">{b.vehicle}</td>
                    <td className="px-8 py-5 font-bold text-xs">{b.spot}</td>
                    <td className="px-8 py-5 font-black text-xs text-emerald-600">₹{b.amount}</td>
                    <td className="px-8 py-5"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">{b.status}</span></td>
                  </tr>
                ))}

                {activeSubTab === 'violations' && data.details.illegalParkings.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5 font-black text-xs">{p.id.slice(-8)}</td>
                    <td className="px-8 py-5 font-bold text-xs">{p.plate}</td>
                    <td className="px-8 py-5 font-bold text-xs text-orange-600 uppercase tracking-tighter">{p.type}</td>
                    <td className="px-8 py-5 font-bold text-xs text-slate-400">{p.location}</td>
                    <td className="px-8 py-5"><span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest">High</span></td>
                  </tr>
                ))}

                {activeSubTab === 'issues' && data.details.roadIssues.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5 font-black text-xs">{i.id.slice(-8)}</td>
                    <td className="px-8 py-5 font-bold text-xs tracking-tight">{i.type || 'Pothole'}</td>
                    <td className="px-8 py-5 font-bold text-xs text-slate-400">{i.location}</td>
                    <td className="px-8 py-5 font-bold text-[10px] text-slate-400 max-w-xs truncate">Reported infrastructure vulnerability</td>
                    <td className="px-8 py-5"><span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest">{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(activeSubTab === 'challans' && data.details.fines.length === 0) ||
             (activeSubTab === 'parking' && data.details.bookings.length === 0) ||
             (activeSubTab === 'violations' && data.details.illegalParkings.length === 0) ||
             (activeSubTab === 'issues' && data.details.roadIssues.length === 0) ? (
              <div className="py-20 text-center text-slate-200">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-black text-sm uppercase tracking-widest">No reports found for this segment</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style jsx="true">{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in {
           from { opacity: 0; transform: translateY(10px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
