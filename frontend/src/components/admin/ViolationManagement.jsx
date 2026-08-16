import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Trash2, Camera, Car, Zap, Shield, Clock, MapPin } from 'lucide-react';

export default function ViolationManagement() {
  const [fines, setFines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    violationType: 'illegal_parking',
    amount: 500,
    location: { name: '', lat: 0, lng: 0 }
  });

  const violationTypes = [
    { 
      id: 'illegal_parking', 
      label: 'Illegal Parking', 
      icon: Car, 
      amount: 500, 
      color: 'orange',
      description: 'Vehicle parked in restricted area'
    },

    { 
      id: 'double_parking', 
      label: 'Double Parking', 
      icon: Car, 
      amount: 750, 
      color: 'amber',
      description: 'Blocking other vehicles'
    },
    { 
      id: 'overtime_parking', 
      label: 'Overtime Parking', 
      icon: Clock, 
      amount: 300, 
      color: 'yellow',
      description: 'Exceeded allowed parking duration'
    },
    { 
      id: 'high_speed', 
      label: 'Over Speeding', 
      icon: Zap, 
      amount: 2000, 
      color: 'red',
      description: 'Exceeding speed limit'
    },
    { 
      id: 'no_helmet', 
      label: 'No Helmet', 
      icon: Shield, 
      amount: 1000, 
      color: 'orange',
      description: 'Riding without helmet'
    },
    { 
      id: 'rush_driving', 
      label: 'Rash Driving', 
      icon: AlertTriangle, 
      amount: 5000, 
      color: 'red',
      description: 'Dangerous driving behavior'
    }
  ];

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/fines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFines(data);
    } catch (error) {
      console.error('Error fetching fines:', error);
    }
  };

  const handleIssueFine = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/fines/issue', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Violation recorded and fine issued!');
      setShowForm(false);
      fetchFines();
      setFormData({
        vehicleNumber: '',
        violationType: 'illegal_parking',
        amount: 500,
        location: { name: '', lat: 0, lng: 0 }
      });
    } catch (error) {
      toast.error('Failed to issue fine');
    }
  };

  const handleCancelFine = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/fines/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fine cancelled');
      fetchFines();
    } catch (error) {
      toast.error('Failed to cancel fine');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500' };
      case 'paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-500' };
      case 'cancelled': return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-500' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-500' };
    }
  };

  const getViolationColor = (type) => {
    const violation = violationTypes.find(v => v.id === type);
    const colors = {
      red: 'from-red-500 to-rose-600',
      orange: 'from-orange-500 to-amber-600',
      amber: 'from-amber-500 to-yellow-600',
      yellow: 'from-yellow-500 to-amber-500'
    };
    return colors[violation?.color] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center">
                <Camera className="w-8 h-8 mr-3 animate-pulse" />
                AI Violation Detection & Management
              </h2>
              <p className="text-orange-100">Automated violation detection with computer vision and smart alerts</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center px-6 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Issue Fine
            </button>
          </div>
        </div>
      </div>

      {/* Violation Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {violationTypes.map((violation) => (
          <div key={violation.id} className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border-2 border-gray-100">
            <div className={`w-12 h-12 bg-gradient-to-br ${getViolationColor(violation.id)} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
              <violation.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 mb-1">{violation.label}</h3>
            <p className="text-xs text-gray-500 mb-2">{violation.description}</p>
            <p className="text-lg font-bold text-gray-800">₹{violation.amount}</p>
          </div>
        ))}
      </div>

      {/* Issue Fine Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-200 animate-slide-down">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
            Issue New Violation Fine
          </h3>
          <form onSubmit={handleIssueFine} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Vehicle Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g., MH-01-AB-1234"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Violation Type</label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                  value={formData.violationType}
                  onChange={(e) => {
                    const violation = violationTypes.find(v => v.id === e.target.value);
                    setFormData({ ...formData, violationType: e.target.value, amount: violation.amount });
                  }}
                >
                  {violationTypes.map((v) => (
                    <option key={v.id} value={v.id}>{v.label} - ₹{v.amount}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Fine Amount (₹)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Location</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                  placeholder="Location name"
                  value={formData.location.name}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, name: e.target.value } })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="submit" 
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                Issue Fine & Send Alert
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fines List */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fine ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Violation</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fines.map((fine) => {
                const statusColors = getStatusColor(fine.status);
                const violation = violationTypes.find(v => v.id === fine.violationType);
                return (
                  <tr key={fine._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-800">{fine.fineId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-800">{fine.vehicleNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {violation && <violation.icon className="w-4 h-4 text-gray-500" />}
                        <span className="text-sm text-gray-700">{fine.violationType.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-gray-800">₹{fine.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span>{fine.location?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${statusColors.badge} text-white`}>
                        {fine.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {fine.status === 'pending' && (
                        <button
                          onClick={() => handleCancelFine(fine._id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
