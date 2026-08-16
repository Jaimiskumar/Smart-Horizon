import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  UploadCloud, 
  CheckCircle, 
  Loader2, 
  Construction, 
  Navigation,
  Info,
  ChevronRight
} from 'lucide-react';

export default function ReportRoadIssue() {
  const [issueType, setIssueType] = useState('Pothole');
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');
  
  const fileInputRef = useRef(null);

  // Auto-locate on mount
  useEffect(() => {
    handleAutoLocate();
  }, []);

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        
        try {
          // Attempt reverse geocoding using a public API or just show coordinates
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data && data.display_name) {
            setLocationName(data.display_name);
          } else {
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (err) {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setLocating(false);
          toast.success('Location detected automatically!');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
        toast.error('Unable to retrieve your location. Please enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!locationName) {
      toast.error('Please provide a location name or landmark.');
      return;
    }
    if (!coordinates.lat || !coordinates.lng) {
      toast.error('GPS coordinates are required. Please enable location.');
      return;
    }
    if (!photo) {
      toast.error('Proof photo is required.');
      return;
    }

    setLoading(true);
    
    try {
      // For images, in a real app we'd use FormData. 
      // For this implementation, we'll mock the imageUrl as a base64 or a local preview URL string
      // normally handled by a cloud storage provider.
      const payload = {
        issueType,
        locationName,
        coordinates,
        description,
        imageUrl: previewUrl // Mocking the upload result
      };

      await axios.post('/api/road-issues', payload);
      
      // Trigger AI Agent Response
      setAgentMessage(`Hello! I am S.I.T.A., your city's Intelligent Traffic Agent. I have received your report about a ${issueType} at ${locationName}. Our vision systems are now verifying the impact on city traffic flow. Thank you for your contribution!`);
      setShowAgentModal(true);

      // Reset form
      setIssueType('Pothole');
      setDescription('');
      setPhoto(null);
      setPreviewUrl('');
      // Keep location as it might be useful for multiple reports in same area
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const issueTypes = [
    { id: 'Pothole', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100', desc: 'Cracks, holes, or uneven road surfaces' },
    { id: 'Under Construction', icon: Construction, color: 'text-blue-500', bg: 'bg-blue-100', desc: 'Ongoing road work without proper signs' },
    { id: 'Roadblock', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100', desc: 'Debris, fallen trees, or illegal barriers' },
    { id: 'Water Logging', icon: Info, color: 'text-indigo-500', bg: 'bg-indigo-100', desc: 'Flooded roads or blocked drainage' },
    { id: 'Other', icon: Info, color: 'text-gray-500', bg: 'bg-gray-100', desc: 'Any other infrastructure concern' }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
        
        {/* Top Header Accent */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">Citizen Power</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 text-sm font-bold">Infrastructure Maintenance</span>
              </div>
              <h1 className="text-4xl font-black text-[#0F172A] leading-tight">
                Report a <span className="text-blue-600">Road Issue</span>
              </h1>
              <p className="text-gray-500 mt-2 font-medium max-w-lg">
                Help us identify potholes, construction delays, or hazards in your area. 
                Your contribution directly improves city safety.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-blue-600">
                <Navigation className={`w-6 h-6 ${locating ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Current Status</p>
                <button 
                  onClick={handleAutoLocate}
                  className="text-sm font-extrabold text-[#0F172A] flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  {locating ? 'Locating...' : 'Refresh GPS Location'}
                  {!locating && <ChevronRight className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Input Fields */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Issue Type Selector */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Select Issue Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issueTypes.map((type) => (
                    <div 
                      key={type.id}
                      onClick={() => setIssueType(type.id)}
                      className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
                        issueType === type.id 
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-50' 
                          : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${type.bg} ${type.color}`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-black text-sm ${issueType === type.id ? 'text-blue-700' : 'text-[#0F172A]'}`}>{type.id}</h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 line-clamp-1">{type.desc}</p>
                      </div>
                      {issueType === type.id && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Location & Details */}
              <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Location Name / Landmark</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input 
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="e.g. Near Station Road, Solapur"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#0F172A] outline-none focus:border-blue-600 focus:bg-white focus:shadow-lg transition-all"
                        required
                      />
                    </div>
                    {coordinates.lat && (
                      <p className="text-[10px] text-gray-400 font-bold mt-2 ml-2 tracking-wide uppercase">
                        Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)} 
                        <span className="ml-2 text-green-500">(Verified via GPS)</span>
                      </p>
                    )}
                 </div>

                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Detailed Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Give us more context... How big is the pothole? Which side of the road?"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 font-medium text-[#0F172A] outline-none focus:border-blue-600 focus:bg-white focus:shadow-lg transition-all min-h-[120px] resize-none whitespace-pre-line"
                    ></textarea>
                 </div>
              </div>
            </div>

            {/* Right Column: Visual Proof */}
            <div className="lg:col-span-5 flex flex-col">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Attach Visual Proof</label>
              
              <div className="flex-1 min-h-[400px] relative group">
                <div 
                  className={`w-full h-full rounded-[2rem] border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-gray-50 shadow-inner group-hover:bg-gray-100 ${
                    photo ? 'border-blue-600/30' : 'border-gray-200 hover:border-blue-400'
                  }`}
                  onClick={() => !photo && fileInputRef.current.click()}
                >
                  {photo ? (
                    <>
                      <img src={previewUrl} alt="Issue" className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex items-center justify-between translate-y-full group-hover:translate-y-0 transition-transform">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
                              <Camera className="w-5 h-5" />
                           </div>
                           <p className="text-white text-xs font-black tracking-widest uppercase">Photo Captured</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {setPhoto(null); setPreviewUrl('');}}
                          className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-red-50 transition-colors shadow-lg"
                        >
                          Retake
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-500">
                        <UploadCloud className="w-10 h-10" />
                      </div>
                      <h4 className="font-black text-[#0F172A] text-xl mb-2">Snap a Photo</h4>
                      <p className="text-gray-400 font-bold text-center px-8 text-sm leading-relaxed">
                        Drag & drop or <span className="text-blue-600">click to upload</span>. 
                        Required for verification.
                      </p>
                    </>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
                <div className="bg-blue-600 p-2 rounded-lg text-white mt-1">
                  <Info className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                  NOTE: All reported issues undergo manual verification by city officials. 
                  False reporting may lead to temporary restriction of citizen services.
                </p>
              </div>
            </div>

          </form>

          {/* Bottom Action Bar */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="flex -space-x-2">
                 {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"></div>
                 ))}
               </div>
               <p className="text-xs font-bold text-gray-500">Join <span className="text-[#0F172A]">1,200+ citizens</span> reporting city issues daily.</p>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className={`min-w-[280px] bg-blue-600 text-white rounded-2xl py-5 px-10 font-black text-lg tracking-widest shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_25px_50px_rgba(37,99,235,0.4)] transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                 <>
                   <Loader2 className="w-6 h-6 animate-spin" />
                   Reporting...
                 </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* S.I.T.A. AI Agent Overlay */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-blue-100 animate-in zoom-in-95 duration-300 scale-100">
              <div className="bg-blue-600 p-6 flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-4 relative">
                    <Loader2 className="w-12 h-12 absolute animate-spin opacity-20" />
                    <Info className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-black text-white">S.I.T.A. Assistant</h2>
                 <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Autonomous City Management</p>
              </div>
              <div className="p-8">
                 <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                    <p className="text-[#0F172A] font-medium leading-relaxed italic text-sm">
                       "{agentMessage}"
                    </p>
                 </div>
                 <button 
                   onClick={() => setShowAgentModal(false)}
                   className="w-full bg-blue-600 text-white rounded-xl py-4 font-black text-sm tracking-widest uppercase hover:bg-blue-700 transition-all shadow-lg"
                 >
                   Got it, thanks!
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
