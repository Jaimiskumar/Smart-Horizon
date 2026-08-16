import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ParkingCircle, MapPin, Clock, XCircle, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchBookings();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/parking/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const mockStr = localStorage.getItem('mockBookings');
      const mockData = mockStr ? JSON.parse(mockStr).filter(b => b.status === 'active') : [];
      setBookings([...data, ...mockData]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      const mockStr = localStorage.getItem('mockBookings');
      const mockData = mockStr ? JSON.parse(mockStr).filter(b => b.status === 'active') : [];
      setBookings(mockData);
    }
  };

  const handleRelease = async (spotId) => {
    if (spotId.startsWith('Mock Slot') || spotId.startsWith('fake-')) {
       const mockStr = localStorage.getItem('mockBookings');
       if (mockStr) {
           let mocks = JSON.parse(mockStr);
           mocks = mocks.filter(b => b.spotId !== spotId);
           localStorage.setItem('mockBookings', JSON.stringify(mocks));
       }
       toast.success('Parking released successfully');
       fetchBookings();
       return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/parking/release/${spotId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Parking released successfully');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to release parking');
    }
  };

  const navigateToParking = (booking) => {
    // Generate a maps URL based on the zone name/location
    const query = encodeURIComponent(`${booking.zone} Solapur Parking`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(mapsUrl, '_blank');
  };

  const getRemainingTime = (endTime) => {
    const end = new Date(endTime);
    const diff = end - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getHoldTimer = (startTime) => {
    const start = new Date(startTime);
    const fifteenMins = 15 * 60 * 1000;
    const expiry = new Date(start.getTime() + fifteenMins);
    const diff = expiry - now;
    
    if (diff <= 0) return { status: 'Expired', text: '00:00', expired: true };
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { 
      status: 'Active', 
      text: `${minutes}:${seconds.toString().padStart(2, '0')}`, 
      expired: false 
    };
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-100">
        <h2 className="text-3xl font-black text-[#0F172A] mb-2 tracking-tight">My Active <span className="text-blue-600">Reservations</span></h2>
        <p className="text-slate-500 font-medium">Manage your bookings and navigate to your secured spots.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {bookings.map((booking) => {
          const isExpired = getRemainingTime(booking.currentBooking.endTime) === 'Expired';

          return (
            <div key={booking.spotId} className={`group bg-white rounded-[2.5rem] shadow-xl p-8 border-2 transition-all duration-300 ${isExpired ? 'border-rose-100 opacity-75' : 'border-slate-50 hover:border-blue-200'}`}>
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center">
                  <div className={`p-4 rounded-2xl mr-4 ${isExpired ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'}`}>
                    <ParkingCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0F172A]">{booking.spotId}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{booking.zone}</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  isExpired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center group">
                    <MapPin className="w-5 h-5 text-slate-300 mr-3 group-hover:text-blue-500 transition-colors" />
                    <span className="text-sm font-bold text-slate-600">{booking.location?.name || booking.zone}</span>
                  </div>
                  <div className="flex items-center text-emerald-600">
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span className="text-sm font-black">{getRemainingTime(booking.currentBooking.endTime)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vehicle</p>
                    <p className="text-sm font-black text-slate-700">{booking.currentBooking.vehicleNumber}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Rate</p>
                    <p className="text-sm font-black text-slate-700">₹{booking.pricePerHour}/hr</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  disabled={isExpired}
                  onClick={() => navigateToParking(booking)}
                  className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg ${
                    isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#0F172A] text-white hover:bg-blue-600 hover:shadow-blue-200'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                  TAKE ME TO MY PARKING
                </button>
                
                <button
                  onClick={() => handleRelease(booking.spotId)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-sm hover:border-rose-200 hover:text-rose-500 transition-all"
                >
                  <XCircle className="w-5 h-5" />
                  CANCEL / RELEASE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {bookings.length === 0 && (
        <div className="bg-white rounded-[3rem] shadow-xl p-20 text-center border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
            <ParkingCircle className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">No Active Bookings</h3>
          <p className="text-slate-400 font-bold mb-8">You haven't reserved any parking spots yet.</p>
          <a href="/citizen/parking" className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-transform">
             FIND PARKING NOW
          </a>
        </div>
      )}
    </div>
  );
}
