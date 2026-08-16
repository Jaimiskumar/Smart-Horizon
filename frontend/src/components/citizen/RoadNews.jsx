import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Construction, 
  CheckCircle, 
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function RoadNews() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIssues();
    
    // Connect to local socket
    const socket = io('http://localhost:5001');
    
    // Listen for new items or status changes in real-time
    socket.on('new-road-issue', (data) => {
       fetchIssues();
       if (data.status === 'Verification') {
         toast.success(`S.I.T.A. has automatically flagged a new ${data.type} for verification at ${data.location}!`);
       } else {
         toast.success(`New ${data.type} reported at ${data.location}`);
       }
    });

    socket.on('road-issue-updated', (data) => {
       fetchIssues();
       toast(`Update: Incident at ${data.location} is now ${data.newStatus}`, {
         icon: 'ℹ️'
       });
    });

    return () => {
       socket.disconnect();
    };
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/road-issues');
      setIssues(data);
    } catch (err) {
      toast.error('Failed to fetch road news updates');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesFilter = activeFilter === 'All' || issue.issueType === activeFilter;
    const matchesSearch = issue.locationName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Reported': return 'bg-red-100 text-red-600 border-red-200';
      case 'Verification': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'In Progress': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Resolved': return 'bg-green-100 text-green-600 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Pothole': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'Under Construction': return <Construction className="w-5 h-5 text-blue-500" />;
      default: return <Megaphone className="w-5 h-5 text-purple-500" />;
    }
  };

  const categories = ['All', 'Pothole', 'Under Construction', 'Roadblock', 'Water Logging'];

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8 font-sans">
      
      {/* Header & Controls Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="bg-red-600 text-white rounded-lg p-2 animate-pulse shadow-lg shadow-red-200">
                <Megaphone className="w-6 h-6" />
             </div>
             <h1 className="text-4xl font-black text-[#0F172A] tracking-tight">
                City <span className="text-red-600">Road News</span>
             </h1>
          </div>
          <p className="text-gray-500 font-medium max-w-lg mb-0">
             Stay informed about traffic hazards and road maintenance updates reported by your community.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
           {/* Search Input */}
           <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors" />
              <input 
                 type="text" 
                 placeholder="Search by area or type..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-white border-2 border-gray-100 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:border-red-500 focus:shadow-lg transition-all w-full sm:min-w-[300px]"
              />
           </div>
           
           <button 
              onClick={fetchIssues}
              className="bg-white border-2 border-gray-100 rounded-2xl p-3.5 text-gray-500 hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
           >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-3 pb-8 hide-scrollbar">
         {categories.map(cat => (
            <button 
               key={cat}
               onClick={() => setActiveFilter(cat)}
               className={`px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 ${
                  activeFilter === cat 
                  ? 'bg-red-600 text-white border-red-600 shadow-md' 
                  : 'bg-white text-gray-500 border-transparent hover:border-red-100 hover:text-red-500'
               }`}
            >
               {cat}
            </button>
         ))}
      </div>

      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
               <div key={i} className="bg-gray-50 rounded-3xl h-80 animate-pulse border-2 border-gray-100"></div>
            ))}
         </div>
      ) : filteredIssues.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredIssues.map((issue) => (
               <div 
                  key={issue._id}
                  className="group bg-white rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden border border-gray-100 relative translate-y-0 hover:-translate-y-2"
               >
                  {/* Image Aspect */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                     <img 
                        src={issue.imageUrl || 'https://images.unsplash.com/photo-1594411132644-84d56708309a?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG90aG9sZXxlbnwwfHwwfHx8MA%3D%3D'} 
                        alt="Issue" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                     />
                     <div className="absolute top-4 left-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 backdrop-blur-md shadow-lg ${getStatusStyle(issue.status)}`}>
                           {issue.status}
                        </span>
                     </div>
                     <div className="absolute bottom-4 left-4 right-4 bg-white/20 backdrop-blur-md rounded-xl p-3 flex items-center justify-between border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-extrabold flex items-center gap-1">
                           <MapPin className="w-3 h-3" />
                           {issue.coordinates?.lat?.toFixed(4)}, {issue.coordinates?.lng?.toFixed(4)}
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${issue.coordinates?.lat},${issue.coordinates?.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white/20 p-1.5 rounded-lg text-white hover:bg-white/40"
                        >
                           <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                     </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 flex flex-col flex-1">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-red-50 transition-colors">
                           {getIcon(issue.issueType)}
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{issue.issueType}</span>
                     </div>

                     <h3 className="text-xl font-black text-[#0F172A] leading-tight mb-2 line-clamp-2">
                        {issue.locationName.split(',')[0]}
                     </h3>
                     
                     <p className="text-sm font-medium text-gray-500 mb-6 flex-1 line-clamp-3 italic">
                        "{issue.description || 'No description provided.'}"
                     </p>

                     <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Clock className="w-4 h-4 text-gray-300" />
                           <span className="text-[11px] font-black text-gray-400 tracking-wide uppercase">
                              {new Date(issue.reportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(issue.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                           {issue.userId?.name?.charAt(0) || 'C'}
                        </div>
                     </div>
                  </div>

               </div>
            ))}
         </div>
      ) : (
         <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
               <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-[#0F172A] mb-2 tracking-tight">All Roads Clear!</h3>
            <p className="text-gray-400 font-bold max-w-sm">
               No active road hazards or pothole reports were found matching your current filter.
            </p>
         </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
