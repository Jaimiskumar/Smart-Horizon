import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, MapPin, Clock, CheckCircle, XCircle, Bot } from 'lucide-react';

export default function EncroachmentMonitoring() {
  const [encroachments, setEncroachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedEncroachment, setSelectedEncroachment] = useState(null);

  useEffect(() => {
    fetchEncroachments();
    const interval = setInterval(fetchEncroachments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEncroachments = async () => {
    try {
      const response = await fetch('/api/encroachments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch encroachments (${response.status})`);
      }
      const data = await response.json();
      setEncroachments(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching encroachments:', error);
      setEncroachments([]);
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await fetch(`/api/encroachments/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      fetchEncroachments();
    } catch (error) {
      console.error('Error resolving encroachment:', error);
    }
  };

  const handleIgnore = async (id) => {
    try {
      await fetch(`/api/encroachments/${id}/ignore`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      fetchEncroachments();
    } catch (error) {
      console.error('Error ignoring encroachment:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'detected': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'warning-issued': 'bg-orange-100 text-orange-800 border-orange-300',
      'alert-sent': 'bg-red-100 text-red-800 border-red-300',
      'resolved': 'bg-green-100 text-green-800 border-green-300',
      'ignored': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'low': 'text-blue-600',
      'medium': 'text-orange-600',
      'high': 'text-red-600'
    };
    return colors[severity] || 'text-gray-600';
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const filteredEncroachments = encroachments.filter(enc => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['detected', 'warning-issued', 'alert-sent'].includes(enc.status);
    return enc.status === filter;
  });

  const stats = {
    total: encroachments.length,
    active: encroachments.filter(e => ['detected', 'warning-issued', 'alert-sent'].includes(e.status)).length,
    resolved: encroachments.filter(e => e.status === 'resolved').length,
    alerts: encroachments.filter(e => e.status === 'alert-sent').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <Camera className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Encroachment & Obstruction Monitor</h2>
        </div>
        <p className="text-purple-100">AI-powered detection of unauthorized hawkers, vendors, and road obstructions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Detections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Camera className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Cases</p>
              <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alerts Sent</p>
              <p className="text-2xl font-bold text-red-600">{stats.alerts}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'detected', 'warning-issued', 'alert-sent', 'resolved', 'ignored'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Encroachments List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEncroachments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-md">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No encroachments found</p>
          </div>
        ) : (
          filteredEncroachments.map((enc) => {
            const encId = enc.id || enc._id;
            return (
            <div key={encId} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Camera Feed Image */}
                <div className="md:w-1/3 relative">
                  <img 
                    src={enc.imageUrl} 
                    alt={`${enc.detectedObject} at ${enc.location}`}
                    className="w-full h-64 md:h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300/6366f1/ffffff?text=Camera+Feed';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1">
                    <Camera className="w-3 h-3" />
                    <span>{enc.cameraId}</span>
                  </div>
                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-lg text-xs font-bold ${getSeverityColor(enc.severity)} bg-white`}>
                    {enc.severity.toUpperCase()}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(enc.status)}`}>
                               {enc.status.replace('-', ' ').toUpperCase()}
                             </span>
                             <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black tracking-widest border border-blue-100 uppercase animate-pulse">
                               <Bot className="w-3 h-3" />
                               Guardian AI Verified
                             </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{enc.detectedObject.toUpperCase()} in {enc.zone.replace('-', ' ')}</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{enc.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Duration: {formatDuration(enc.stationaryDuration)}</span>
                        </div>
                        {enc.licensePlate && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <span className="font-mono font-bold">{enc.licensePlate}</span>
                          </div>
                        )}
                      </div>

                      {enc.notes && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">{enc.notes}</p>
                      )}

                      <div className="text-xs text-gray-500">
                        Detected: {new Date(enc.detectionTime).toLocaleString()}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    {['detected', 'warning-issued', 'alert-sent'].includes(enc.status) && (
                      <div className="flex md:flex-col gap-2">
                        <button
                          onClick={() => handleResolve(encId)}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </button>
                        <button
                          onClick={() => handleIgnore(encId)}
                          className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Ignore
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
