import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, AlertCircle } from 'lucide-react';

export default function Analytics() {
  const [signals, setSignals] = useState([]);
  const [fines, setFines] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [signalsRes, finesRes] = await Promise.all([
        axios.get('/api/traffic/signals', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/fines', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSignals(signalsRes.data);
      setFines(finesRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const trafficData = signals.map(s => ({
    name: s.signalId,
    vehicles: s.vehicleCount,
    congestion: s.congestionLevel === 'high' ? 3 : s.congestionLevel === 'medium' ? 2 : 1
  }));

  const fineStats = {
    total: fines.length,
    pending: fines.filter(f => f.status === 'pending').length,
    paid: fines.filter(f => f.status === 'paid').length,
    revenue: fines.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">Traffic Analytics</h2>
        <p className="text-gray-600">System performance and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm">Total Signals</p>
              <p className="text-3xl font-bold text-blue-700">{signals.length}</p>
            </div>
            <Activity className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm">Fines Collected</p>
              <p className="text-3xl font-bold text-green-700">₹{fineStats.revenue}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-400" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm">Pending Fines</p>
              <p className="text-3xl font-bold text-yellow-700">{fineStats.pending}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm">Total Fines</p>
              <p className="text-3xl font-bold text-purple-700">{fineStats.total}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Vehicle Count by Signal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="vehicles" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Congestion Levels</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="congestion" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
