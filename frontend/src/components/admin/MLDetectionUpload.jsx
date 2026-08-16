import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, CheckCircle, AlertTriangle, Camera, Film, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const MLDetectionUpload = () => {
  const [activeTab, setActiveTab] = useState('process');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentViolations, setRecentViolations] = useState([]);
  const [stats, setStats] = useState({ today: {}, total: {} });
  const [socket, setSocket] = useState(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
  const apiUrl = BACKEND_URL;
  const socketUrl = BACKEND_URL || undefined;
  
  const fileInputRef = useRef(null);
  const cameraId = 'UPLOAD-CAM-001';
  const speedLimit = 60;

  // Initialize Socket.IO
  useEffect(() => {
    const socketOptions = {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    };

    const socketInstance = socketUrl ? io(socketUrl, socketOptions) : io(socketOptions);

    socketInstance.on('helmet_violation_detected', (data) => {
      toast.error(`🪖 Helmet Violation: ${data.vehicleNumber} (₹${data.fine})`);
    });

    socketInstance.on('speeding_detected', (data) => {
      toast.error(`🚗 Speeding: ${data.vehicleNumber} at ${data.speed} km/h (₹${data.fine})`);
    });

    socketInstance.on('signal_violation_detected', (data) => {
      toast.error(`🚦 Signal Violation: ${data.vehicleNumber} (₹${data.fine})`);
    });

    socketInstance.on('street_encroachment_detected', (data) => {
      toast.warning(`👥 Crowd/Encroachment: ${data.crowdSize} people detected`);
    });

    socketInstance.on('challan_issued', (data) => {
      toast.success(`🎟️ Challan Issued: ${data.challanNumber}`);
    });

    setSocket(socketInstance);

    return () => socketInstance.disconnect();
  }, []);

  // Fetch violations and stats
  const fetchViolationsAndStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [violationsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/api/ml-detection/violations?limit=5&type=all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/ml-detection/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (violationsRes.ok) {
        const violationsData = await violationsRes.json();
        setRecentViolations(violationsData.data || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || { today: {}, total: {} });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchViolationsAndStats();
    const interval = setInterval(fetchViolationsAndStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessFrame = async () => {
    if (!preview) {
      toast.error('Please upload a frame image first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/ml-detection/process-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cameraId,
          frameUrl: preview,
          location: 'Test Location',
          latitude: 37.7749,
          longitude: -122.4194,
          signalStatus: 'green',
          speedLimit: speedLimit
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast.success(`✅ Processed! ${data.summary.totalViolations} violations detected`);
        fetchViolationsAndStats();
      } else {
        toast.error(data.message || 'Processing failed');
      }
    } catch (error) {
      toast.error('Error processing frame: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`${apiUrl}/api/ml-detection/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast.success('📸 Image uploaded and processed successfully!');
        fetchViolationsAndStats();
        setSelectedFile(null);
        setPreview(null);
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch(`${apiUrl}/api/ml-detection/upload-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast.success('🎬 Video processed! Frames analyzed successfully');
        fetchViolationsAndStats();
        setSelectedFile(null);
        setPreview(null);
      } else {
        toast.error(data.message || 'Video processing failed');
      }
    } catch (error) {
      toast.error('Error processing video: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Camera className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">ML Detection System</h1>
          </div>
          <p className="text-slate-400">Process camera frames, upload images/videos, and auto-generate challans</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('process')}
            className={`flex-1 py-2 px-4 rounded transition ${
              activeTab === 'process'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            Process Frame
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-4 rounded transition ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`flex-1 py-2 px-4 rounded transition ${
              activeTab === 'violations'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Recent Violations
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-4 rounded transition ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Statistics
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'process' && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Process Camera Frame</h2>
                
                {/* File Upload */}
                <div className="mb-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
                  >
                    <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Upload Frame Image</p>
                    <p className="text-slate-400 text-sm">Click to select an image or drag & drop</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="mb-6">
                    <p className="text-slate-300 text-sm mb-2">Preview:</p>
                    <img src={preview} alt="Preview" className="w-full max-h-96 object-cover rounded-lg" />
                  </div>
                )}

                {/* Process Button */}
                <button
                  onClick={handleProcessFrame}
                  disabled={loading || !preview}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Process Frame
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-6">
                {/* Upload Image */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">📸 Upload Single Image</h2>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition"
                  >
                    <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Select Image</p>
                    <p className="text-slate-400 text-sm">JPEG, PNG supported</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {selectedFile && (
                    <p className="text-slate-300 text-sm mt-4">
                      Selected: <span className="text-green-400 font-semibold">{selectedFile.name}</span>
                    </p>
                  )}

                  <button
                    onClick={handleUploadImage}
                    disabled={loading || !selectedFile || selectedFile.type.startsWith('video')}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition"
                  >
                    {loading ? 'Uploading...' : 'Upload & Process Image'}
                  </button>
                </div>

                {/* Upload Video */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">🎬 Upload Video</h2>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition"
                  >
                    <Film className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Select Video</p>
                    <p className="text-slate-400 text-sm">MP4, AVI supported (extracts frames)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/x-msvideo"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {selectedFile && selectedFile.type.startsWith('video') && (
                    <p className="text-slate-300 text-sm mt-4">
                      Selected: <span className="text-purple-400 font-semibold">{selectedFile.name}</span>
                    </p>
                  )}

                  <button
                    onClick={handleUploadVideo}
                    disabled={loading || !selectedFile || !selectedFile.type.startsWith('video')}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition"
                  >
                    {loading ? 'Processing...' : 'Upload & Process Video'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'violations' && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">🚨 Recent Violations</h2>
                
                {recentViolations.length > 0 ? (
                  <div className="space-y-4">
                    {recentViolations.map((violation, idx) => (
                      <div key={idx} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-semibold">{violation.vehicleNumber}</p>
                            <p className="text-slate-400 text-sm mt-1">
                              {violation.violationType || violation.helmetStatus} • ₹{violation.fineAmount}
                            </p>
                            <p className="text-slate-500 text-xs mt-2">
                              {violation.signalLocation || violation.location}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${
                            violation.status === 'pending' 
                              ? 'bg-yellow-500/20 text-yellow-300' 
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {violation.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No violations detected yet</p>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <p className="text-slate-400 text-sm mb-2">Today's Helmet Violations</p>
                    <p className="text-3xl font-bold text-red-400">{stats.today?.helmetViolations || 0}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <p className="text-slate-400 text-sm mb-2">Today's Speeding</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.today?.speedingViolations || 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <p className="text-slate-400 text-sm mb-2">Today's Signal Violations</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats.today?.signalViolations || 0}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <p className="text-slate-400 text-sm mb-2">Total Violations</p>
                    <p className="text-3xl font-bold text-blue-400">
                      {(stats.total?.helmetViolations || 0) + (stats.total?.trafficViolations || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            {result && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold text-white">Processing Result</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-700/50 p-3 rounded">
                    <p className="text-slate-400 text-xs">Vehicles Detected</p>
                    <p className="text-2xl font-bold text-white">{result.summary?.vehiclesDetected || 0}</p>
                  </div>

                  <div className="bg-red-900/20 border border-red-800 p-3 rounded">
                    <p className="text-slate-400 text-xs">Helmet Violations</p>
                    <p className="text-2xl font-bold text-red-400">{result.summary?.helmetViolations || 0}</p>
                  </div>

                  <div className="bg-orange-900/20 border border-orange-800 p-3 rounded">
                    <p className="text-slate-400 text-xs">Speeding Violations</p>
                    <p className="text-2xl font-bold text-orange-400">{result.summary?.speedingViolations || 0}</p>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-800 p-3 rounded">
                    <p className="text-slate-400 text-xs">Signal Violations</p>
                    <p className="text-2xl font-bold text-yellow-400">{result.summary?.signalViolations || 0}</p>
                  </div>

                  <div className="bg-green-900/20 border border-green-800 p-3 rounded">
                    <p className="text-slate-400 text-xs">Challans Generated</p>
                    <p className="text-2xl font-bold text-green-400">{result.summary?.challansGenerated || 0}</p>
                  </div>

                  {result.challansCreated && result.challansCreated.length > 0 && (
                    <div className="mt-4 bg-slate-700/50 p-3 rounded">
                      <p className="text-slate-300 text-xs font-semibold mb-2">Challans Created:</p>
                      {result.challansCreated.map((c, idx) => (
                        <p key={idx} className="text-green-400 text-xs mb-1">
                          {c.challanNumber} - {c.vehicleNumber} (₹{c.fine})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLDetectionUpload;
