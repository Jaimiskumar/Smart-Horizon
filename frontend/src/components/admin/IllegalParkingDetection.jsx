import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, MapPin, Clock, DollarSign, Phone, CheckCircle, XCircle, Bell, FileText } from 'lucide-react';

export default function IllegalParkingDetection() {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    fetchViolations();
    fetchStats();
    const interval = setInterval(() => {
      fetchViolations();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchViolations = async () => {
    try {
      const response = await fetch('/api/illegal-parking', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch violations (${response.status})`);
      }
      const data = await response.json();
      setViolations(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setViolations([]);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/illegal-parking/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch stats (${response.status})`);
      }
      const data = await response.json();
      setStats(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({});
    }
  };

  const handleSendAlert = async (id) => {
    try {
      await fetch(`/api/illegal-parking/${id}/send-alert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      fetchViolations();
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  };

  const handleIssueFine = async (id) => {
    try {
      await fetch(`/api/illegal-parking/${id}/issue-fine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      fetchViolations();
      fetchStats();
    } catch (error) {
      console.error('Error issuing fine:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await fetch(`/api/illegal-parking/${id}/dismiss`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'False positive or resolved' })
      });
      fetchViolations();
    } catch (error) {
      console.error('Error dismissing violation:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'detected': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'alert-sent': 'bg-orange-100 text-orange-800 border-orange-300',
      'fine-issued': 'bg-red-100 text-red-800 border-red-300',
      'paid': 'bg-green-100 text-green-800 border-green-300',
      'dismissed': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getViolationTypeLabel = (type) => {
    const labels = {
      'no-parking-zone': 'No Parking Zone',
      'blocking-traffic': 'Blocking Traffic',
      'footpath-parking': 'Footpath Parking',
      'fire-lane': 'Fire Lane',
      'disabled-spot': 'Disabled Spot',
      'double-parking': 'Double Parking',
      'bus-stop': 'Bus Stop Violation'
    };
    return labels[type] || type;
  };

  const filteredViolations = violations.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['detected', 'alert-sent'].includes(v.status);
    return v.status === filter;
  });

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
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <Camera className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Illegal Parking Detection System</h2>
        </div>
        <p className="text-red-100">AI-powered CCTV monitoring with automatic license plate recognition and fine generation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Violations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <Camera className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Cases</p>
              <p className="text-2xl font-bold text-orange-600">{(stats.detected || 0) + (stats.alertSent || 0)}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fines Issued</p>
              <p className="text-2xl font-bold text-red-600">{stats.fineIssued || 0}</p>
            </div>
            <FileText className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Fines</p>
              <p className="text-2xl font-bold text-green-600">₹{(stats.totalFineAmount || 0).toLocaleString()}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'detected', 'alert-sent', 'fine-issued', 'paid', 'dismissed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Violations List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredViolations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-md">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No violations found</p>
          </div>
        ) : (
          filteredViolations.map((violation) => {
            const violationId = violation.id || violation._id;
            return (
            <div key={violationId} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="md:w-1/3 relative bg-gray-100">
                  <img 
                    src={violation.imageUrl} 
                    alt={`Violation ${violation.licensePlate}`}
                    className="w-full h-64 md:h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Illegal+Parking';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1">
                    <Camera className="w-3 h-3" />
                    <span>{violation.cameraId}</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-lg text-xs font-bold text-green-600">
                    {violation.confidence}% Confidence
                  </div>
                  <div className="absolute bottom-2 left-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                    ₹{violation.fineAmount}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(violation.status)}`}>
                              {violation.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 font-mono">{violation.licensePlate}</h3>
                          <p className="text-sm text-red-600 font-semibold mt-1">{getViolationTypeLabel(violation.violationType)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{violation.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(violation.detectionTime).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Authority Info */}
                      {violation.authority && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <div className="flex items-center space-x-2 mb-1">
                            <Phone className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">{violation.authority.name}</span>
                          </div>
                          <p className="text-xs text-blue-700">Contact: {violation.authority.contact}</p>
                          <p className="text-xs text-blue-700">Distance: {violation.authority.distance}</p>
                        </div>
                      )}

                      {violation.alertDetails && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Alert sent at: {new Date(violation.alertDetails.sentAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    {['detected', 'alert-sent'].includes(violation.status) && (
                      <div className="flex md:flex-col gap-2">
                        {violation.status === 'detected' && !violation.alertSent && (
                          <button
                            onClick={() => handleSendAlert(violationId)}
                            className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <Bell className="w-4 h-4 mr-2" />
                            Send Alert
                          </button>
                        )}
                        {(violation.status === 'alert-sent' || violation.alertSent) && (
                          <button
                            onClick={() => handleIssueFine(violationId)}
                            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Issue Fine
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(violationId)}
                          className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => setSelectedViolation(violation)}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                    
                    {violation.status === 'fine-issued' && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-sm font-semibold text-red-900">Fine Issued</p>
                        <p className="text-xs text-red-700">Amount: ₹{violation.fineAmount}</p>
                        {violation.fineDetails && (
                          <p className="text-xs text-red-700">Due: {new Date(violation.fineDetails.dueDate).toLocaleDateString()}</p>
                        )}
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

      {/* Violation Details Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedViolation(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold mb-4">Violation Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">License Plate</p>
                  <p className="text-lg font-bold font-mono">{selectedViolation.licensePlate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fine Amount</p>
                  <p className="text-lg font-bold text-red-600">₹{selectedViolation.fineAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Violation Type</p>
                  <p className="text-lg font-semibold">{getViolationTypeLabel(selectedViolation.violationType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedViolation.status)}`}>
                    {selectedViolation.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-lg">{selectedViolation.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Camera ID</p>
                  <p className="text-lg font-mono">{selectedViolation.cameraId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Detection Time</p>
                  <p className="text-lg">{new Date(selectedViolation.detectionTime).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="text-lg font-bold text-green-600">{selectedViolation.confidence}%</p>
                </div>
              </div>

              {selectedViolation.authority && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2">Nearest Authority</h4>
                  <p className="text-sm"><strong>Name:</strong> {selectedViolation.authority.name}</p>
                  <p className="text-sm"><strong>Contact:</strong> {selectedViolation.authority.contact}</p>
                  <p className="text-sm"><strong>Distance:</strong> {selectedViolation.authority.distance}</p>
                </div>
              )}

              <img 
                src={selectedViolation.imageUrl} 
                alt="Violation evidence"
                className="w-full rounded-lg"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600/ef4444/ffffff?text=Illegal+Parking+Evidence';
                }}
              />
            </div>

            <button 
              onClick={() => setSelectedViolation(null)}
              className="w-full mt-6 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
