import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ParkingBooking({ user }) {
  const [spots, setSpots] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [shadowOptions, setShadowOptions] = useState([]);
  const [showShadowOnly, setShowShadowOnly] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
  
  // Combined date/time/duration states for the calendar side bar
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('18:00');
  const [duration, setDuration] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [localBookings, setLocalBookings] = useState([]);
  const [vehicleType, setVehicleType] = useState('4-wheeler');

  useEffect(() => {
    fetchSpots();
  }, []);

  useEffect(() => {
    fetchShadowOptions(selectedZone);
  }, [selectedZone]);

  const createFallbackShadowOptions = (zoneId) => {
    const zone = zonesMap?.[zoneId] || { name: zoneId || 'Local Zone', pricePerHour: 60 };
    const basePrice = Number(zone.pricePerHour || 60);
    return Array.from({ length: 4 }, (_, idx) => ({
      spotId: `${zoneId || 'LOCAL'}-SHADOW-${String(idx + 1).padStart(2, '0')}`,
      location: { name: `${zone.name} Shadow Bay ${idx + 1}` },
      basePrice,
      shadowPremium: 0.25,
      finalPrice: basePrice * 1.25,
      amenities: ['Covered parking', 'CCTV', 'Reserved access'],
      features: ['Premium shade', 'Fast entry', 'Secure bay'],
      rating: 4.6,
      status: 'available'
    }));
  };

  const fetchSpots = async () => {
    try {
      const { data } = await axios.get('/api/parking/spots');
      setSpots(data);
      if (data.length > 0) {
         const initialZone = data[0].zone || data[0].zoneId;
         setSelectedZone(initialZone);
      }
    } catch (error) {
      toast.error('Failed to load parking spots');
    }
  };

  const fetchShadowOptions = async (zoneId) => {
    if (!zoneId) {
      setShadowOptions([]);
      return;
    }
    try {
      const { data } = await axios.get(`/api/parking-amenities/shadow/${encodeURIComponent(zoneId)}`);
      setShadowOptions(data.spots || createFallbackShadowOptions(zoneId));
    } catch (error) {
      setShadowOptions(createFallbackShadowOptions(zoneId));
    }
  };

  const zonesMap = spots.reduce((acc, spot) => {
    const zoneKey = spot.zone || spot.zoneId || 'Unknown Zone';
    if (!acc[zoneKey]) acc[zoneKey] = { id: zoneKey, name: zoneKey, pricePerHour: spot.pricePerHour || 100, spots: [] };
    acc[zoneKey].spots.push(spot);
    return acc;
  }, {});

  const solapurHubs = [
    { name: 'Siddheshwar Temple', price: 80 },
    { name: 'Balives (Old Mill)', price: 50 },
    { name: 'Navi Peth Market', price: 100 },
    { name: 'Solapur Railway Station', price: 40 },
    { name: 'Bhuikot Fort Area', price: 30 },
    { name: 'Hotgi Road (Soham Mall)', price: 120 },
    { name: 'ST Stand (Central)', price: 60 }
  ];

  solapurHubs.forEach(hub => {
    if (!zonesMap[hub.name]) {
      zonesMap[hub.name] = { id: hub.name, name: hub.name, pricePerHour: hub.price, spots: [] };
    }
  });

  // Set initial zone to first Solapur Hub if none from DB
  if (!selectedZone && solapurHubs.length > 0) {
     setSelectedZone(solapurHubs[0].name);
  }

  const zonesList = Object.values(zonesMap).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const activeZone = zonesMap[selectedZone];

  const calculateSpotPrice = (spot, selectedDuration) => {
    const basePrice = Number(spot?.pricePerHour || activeZone?.pricePerHour || 100);
    const hours = Number(selectedDuration || duration || 1);
    const total = basePrice * hours;
    if (spot?.isShadowParking) {
      const premium = Number(spot.shadowPremium || 0.25);
      return total * (1 + premium);
    }
    return total;
  };

  const currentBookingSummary = selectedSpot ? {
    totalAmount: calculateSpotPrice(selectedSpot, duration),
    isShadow: selectedSpot.isShadowParking,
    premiumBreakdown: selectedSpot.isShadowParking ? {
      baseAmount: Number(selectedSpot.pricePerHour || activeZone?.pricePerHour || 100) * duration,
      shadowPremium: Number(selectedSpot.shadowPremium || 0.25)
    } : null
  } : null;

  // Massive robust top-down parking layout enforcing multiple lanes
  const parkingLanes = useMemo(() => {
    if (!activeZone) return [];
    
    // Sort and store real db slots
    const realSpots = [...activeZone.spots].sort((a, b) => a.spotId.localeCompare(b.spotId));
    
    const lanes = [];
    const numLanes = vehicleType === '2-wheeler' ? 16 : 12; 
    const spotsPerLane = vehicleType === '2-wheeler' ? 24 : 14; 
    
    // Filter real db slots by current vehicle vehicleType
    const filteredRealSpots = realSpots
      .filter(s => (s.vehicleCategory || '4-wheeler') === vehicleType)
      .filter(s => !showShadowOnly || s.isShadowParking);

    // Create base massive lanes
    for (let lIdx = 0; lIdx < numLanes; lIdx++) {
      const letter = String.fromCharCode(65 + lIdx);
      const isEVLane = vehicleType === 'ev' && (letter === 'E' || letter === 'V');
      
      const lane = { id: `Lane ${letter}`, label: `LANE ${letter}`, spots: [] };
      for (let s = 1; s <= spotsPerLane; s++) {
          const fakeId = `fake-${vehicleType}-${lIdx}-${s}`;
          // Deterministic ambient layout
          const isFakeOccupied = ((lIdx * 7) + (s * 3)) % 10 > 7;
          const status = localBookings.includes(fakeId) ? 'occupied' : (isFakeOccupied ? 'occupied' : 'available');
          
          let basePrice = vehicleType === '2-wheeler' ? Math.floor(activeZone.pricePerHour * 0.5) : activeZone.pricePerHour;
          if (isEVLane) basePrice = Math.floor(basePrice * 1.2); // 20% premium for EV charging infrastructure

          lane.spots.push({ 
            spotId: fakeId, 
            status: status, 
            isReal: false, 
            displayNum: `${letter}${String(s).padStart(2, '0')}`,
            pricePerHour: basePrice,
            vehicleCategory: vehicleType,
            isEV: isEVLane
          });
      }
      lanes.push(lane);
    }
    
    // Embed reality sequential
    if (filteredRealSpots.length > 0) {
        let curr = 0;
        const totalSimulatedSlots = numLanes * spotsPerLane;
        for (const rs of filteredRealSpots) {
           if (curr >= totalSimulatedSlots) break;
           const lIdx = Math.floor(curr / spotsPerLane);
           const sIdx = curr % spotsPerLane;
           
           const letter = String.fromCharCode(65 + lIdx);
           const finalStatus = localBookings.includes(rs.spotId) ? 'occupied' : rs.status;
           
           lanes[lIdx].spots[sIdx] = { 
               ...rs, 
               status: finalStatus,
               isReal: true, 
               displayNum: `${letter}${String(sIdx + 1).padStart(2, '0')}` 
           };
           curr++;
        }
    }
    
    return lanes;
  }, [selectedZone, spots, localBookings, activeZone, vehicleType, showShadowOnly]);

  const saveMockBooking = (spot) => {
    const newMock = {
      spotId: `Mock Slot ${spot.displayNum || spot.spotId}`,
      zone: activeZone?.name || 'Local Zone',
      status: 'active',
      location: { name: activeZone?.name || 'Local Zone' },
      pricePerHour: spot.pricePerHour || 100,
      vehicleCategory: spot.vehicleCategory,
      currentBooking: {
        vehicleNumber: user?.vehicleNumber || 'USER-MOCK',
        paymentStatus: 'paid',
        startTime: new Date().toISOString(),
        endTime: new Date(new Date().getTime() + duration * 60 * 60 * 1000).toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    const existingStr = localStorage.getItem('mockBookings');
    const existing = existingStr ? JSON.parse(existingStr) : [];
    localStorage.setItem('mockBookings', JSON.stringify([newMock, ...existing]));
  };

  const handleBook = async () => {
    if (!selectedSpot) return;
    setLoading(true);

    try {
      if (selectedSpot.isReal) {
         const endpoint = selectedSpot.isShadowParking ? '/api/parking-amenities/shadow/book' : '/api/parking/book';
         const payload = selectedSpot.isShadowParking
           ? {
               spotId: selectedSpot.spotId,
               duration,
             }
           : {
               spotId: selectedSpot.spotId,
               vehicleNumber: user?.vehicleNumber || 'UNKNOWN',
               duration,
               date: bookingDate,
               time: bookingTime
             };

         const { data } = await axios.post(endpoint, payload);
         const booking = data.booking || data;
         const totalAmount = booking?.pricing?.totalAmount || booking?.amount || calculateSpotPrice(selectedSpot, duration);

         setPaymentContext({
           show: true,
           step: 1,
           loading: false,
           booking,
           amount: totalAmount,
           currency: booking?.currency || 'INR',
           spot: selectedSpot,
           description: selectedSpot.isShadowParking ? 'Shadow parking reservation' : 'Standard parking reservation'
         });
      } else {
         const totalAmount = calculateSpotPrice(selectedSpot, duration);
         setPaymentContext({
           show: true,
           step: 1,
           loading: false,
           booking: {
             spotId: selectedSpot.spotId,
             pricing: { totalAmount }
           },
           amount: totalAmount,
           currency: 'INR',
           spot: selectedSpot,
           description: selectedSpot.isShadowParking ? 'Shadow parking reservation' : 'Standard parking reservation'
         });
      }
    } catch (error) {
      console.error(error);
      const totalAmount = calculateSpotPrice(selectedSpot, duration);
      setPaymentContext({
        show: true,
        step: 1,
        loading: false,
        booking: {
          spotId: selectedSpot.spotId,
          pricing: { totalAmount }
        },
        amount: totalAmount,
        currency: 'INR',
        spot: selectedSpot,
        description: selectedSpot.isShadowParking ? 'Shadow parking reservation' : 'Standard parking reservation'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentOrder = async () => {
    const referenceId = paymentContext?.booking?.spotId || paymentContext?.spot?.spotId;
    if (!referenceId) return null;
    try {
      const { data } = await axios.post('/api/payments/orders', {
        transactionType: 'parking',
        referenceId
      });
      return data;
    } catch (error) {
      console.warn('Failed to create payment order:', error?.response?.data?.message || error.message);
      return {
        provider: 'mock',
        providerOrderId: `mock_${Date.now()}`,
        keyId: null,
        amount: paymentContext?.amount || calculateSpotPrice(selectedSpot, duration)
      };
    }
  };

  const handleStartPayment = async () => {
    setPaymentContext(prev => ({ ...prev, loading: true }));
    const order = await handleCreatePaymentOrder();
    setPaymentContext(prev => ({ ...prev, order, loading: false, step: 2 }));
  };

  const handleConfirmPayment = async () => {
    setPaymentContext(prev => ({ ...prev, loading: true }));
    await new Promise((resolve) => setTimeout(resolve, 1600));

    if (paymentContext?.spot && !paymentContext?.booking?.bookingId) {
      saveMockBooking(paymentContext.spot);
      setLocalBookings(prev => [...prev, paymentContext.spot.spotId]);
    }

    setPaymentContext(prev => ({ ...prev, loading: false, step: 3 }));
    toast.success('Payment gateway authorization successful');
  };

  const closePaymentOverlay = () => {
    setPaymentContext(null);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-32">
      {/* Header Event details - Simplified */}
      <div className="flex border-b border-gray-200 bg-white p-4 relative justify-center shadow-sm z-10 lg:hidden">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl font-extrabold tracking-wide">{selectedZone ? selectedZone.toUpperCase() : 'SELECT A ZONE'}</h2>
        </div>
      </div>

      {/* Vehicle Type Toggle */}
      <div className="flex flex-wrap justify-center py-6 bg-white border-b border-gray-100 gap-3 px-4">
         <button 
            onClick={() => { setVehicleType('4-wheeler'); setSelectedSpot(null); }}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all w-full sm:w-auto ${
               vehicleType === '4-wheeler' 
               ? 'bg-[#0F172A] text-white shadow-xl scale-105' 
               : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
         >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
            4 WHEELER
         </button>
         <button 
            onClick={() => { setVehicleType('2-wheeler'); setSelectedSpot(null); }}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all w-full sm:w-auto ${
               vehicleType === '2-wheeler' 
               ? 'bg-[#0F172A] text-white shadow-xl scale-105' 
               : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
         >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 5.5l.5-.5c.8-.8 1.5-1 2-1s1.2.2 2 1 1 .5 1.5.5.9 0 1.5-.5h.5c0 1.4-1.1 2.5-2.5 2.5s-1.8-.1-2.5-.5-1.1-.5-1.5-.5-.4 0-.8.3l-.7.7c-.1.1-.3.1-.4 0s-.1-.2 0-.4l.5-.6zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-8.8-7l-1.2-3h-2v1h1.4l1.2 3.1c-.4.4-.6.9-.6 1.4 0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4L15.2 12H11.5l1.6-4h-2.1l-2.8 4z"/></svg>
            2 WHEELER
         </button>
         <button 
            onClick={() => { setVehicleType('ev'); setSelectedSpot(null); }}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all w-full sm:w-auto ${
               vehicleType === 'ev' 
               ? 'bg-[#10B981] text-white shadow-xl scale-105 border-2 border-emerald-400/50' 
               : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
         >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            SOLAPUR EV (CHARGING)
         </button>
      </div>

      {/* Main Layout containing Sidebar and Map */}
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start gap-4 md:gap-8 p-3 md:p-8">
         
         {/* Left Side: Calendar & Time Picker Sidebar */}
         <div className="w-full lg:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-sm lg:sticky lg:top-8 z-10">
            <h3 className="font-extrabold text-[#0F172A] mb-4 md:mb-6 flex items-center gap-2">
               <div className="p-2 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               </div>
               <span className="text-sm md:text-base">Booking Schedule</span>
            </h3>

            <div className="flex flex-col gap-5">
               <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Select Area</label>
                 <select 
                   value={selectedZone}
                   onChange={(e) => { setSelectedZone(e.target.value); setSelectedSpot(null); }}
                   className="w-full bg-gray-50 border border-gray-200 text-[#0F172A] text-sm rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] block p-3.5 font-semibold transition-all outline-none appearance-none"
                 >
                    {zonesList.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                 </select>
               </div>

               <div className="flex items-center gap-3">
                 <button
                   onClick={() => setShowShadowOnly(prev => !prev)}
                   className={`flex-1 text-xs font-black uppercase tracking-[0.25em] py-3 rounded-2xl transition ${showShadowOnly ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                 >
                   {showShadowOnly ? 'All Parking' : 'Shadow Only'}
                 </button>
                 <span className="text-[11px] text-slate-500">{showShadowOnly ? 'Filtered view' : 'Full map'}</span>
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Select Date</label>
                 <input 
                   type="date" 
                   value={bookingDate}
                   onChange={(e) => setBookingDate(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 text-[#0F172A] text-sm rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] block p-3.5 font-semibold transition-all outline-none"
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Arrival Time</label>
                 <input 
                   type="time" 
                   value={bookingTime}
                   onChange={(e) => setBookingTime(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 text-[#0F172A] text-sm rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] block p-3.5 font-semibold transition-all outline-none"
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Duration (Hours)</label>
                 <select 
                   value={duration}
                   onChange={(e) => setDuration(Number(e.target.value))}
                   className="w-full bg-gray-50 border border-gray-200 text-[#0F172A] text-sm rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] block p-3.5 font-semibold transition-all outline-none appearance-none"
                 >
                   <option value={1}>1 Hour</option>
                   <option value={2}>2 Hours</option>
                   <option value={4}>4 Hours</option>
                   <option value={8}>8 Hours</option>
                   <option value={12}>12 Hours</option>
                   <option value={24}>24 Hours</option>
                 </select>
               </div>
            </div>
            
            <div className="mt-8 bg-green-50/80 p-4 rounded-xl border border-green-100/50">
               <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1.5">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                 Dynamic Pricing Active
               </div>
               <p className="text-[11px] text-green-600 font-medium leading-relaxed">
                 Parking occupancy and street logic automatically updates space layout rates to mirror the selected arrival date & time.
               </p>
            </div>
         </div>

          {/* Right Side: True Parking Canvas */}
          <div className="flex-1 w-full bg-white border border-gray-200 shadow-sm rounded-2xl flex flex-col items-center overflow-hidden">
             {activeZone ? (
               <div className="p-4 md:p-8 w-full overflow-x-auto hide-scrollbar select-none pt-10">
                 
                 <div className="text-center w-full mb-8">
                   <div className="font-bold text-lg tracking-widest text-[#0F172A] bg-gray-50 px-6 py-2 rounded-lg border border-gray-200 inline-block uppercase shadow-sm">
                     {activeZone.name} PARKING BAY 
                     <span className="block text-sm text-gray-500 font-medium tracking-normal mt-1">₹{activeZone.pricePerHour}/hr</span>
                   </div>
                 </div>

                 {shadowOptions.length > 0 && (
                   <div className="mb-6 grid gap-4 sm:grid-cols-2">
                      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 shadow-sm">
                         <div className="text-xs uppercase tracking-[0.3em] font-black text-amber-700 mb-2">Shadow Parking</div>
                         <p className="text-sm text-slate-600 leading-relaxed mb-4">Premium shadow bays with reserved protection, close access, and intelligent pricing in this zone.</p>
                         <div className="space-y-3">
                           {shadowOptions.slice(0, 3).map((spot) => (
                             <div key={spot.spotId} className="rounded-2xl border border-amber-100 p-3 bg-white/90 flex items-center justify-between gap-3">
                               <div>
                                 <p className="text-sm font-black text-slate-900">{spot.spotId}</p>
                                 <p className="text-[11px] text-slate-500">₹{spot.finalPrice.toFixed(0)} total</p>
                               </div>
                               <button
                                 onClick={() => setSelectedSpot({
                                   ...spot,
                                   pricePerHour: spot.basePrice,
                                   isShadowParking: true,
                                   isReal: true,
                                   displayNum: spot.spotId,
                                   vehicleCategory: vehicleType
                                 })}
                                 className="text-[11px] font-black uppercase tracking-[0.24em] text-white bg-amber-700 px-3 py-2 rounded-2xl hover:bg-amber-800 transition-all"
                               >
                                 Reserve
                               </button>
                             </div>
                           ))}
                         </div>
                         {shadowOptions.length > 3 && (
                           <p className="text-[11px] font-semibold text-slate-500 mt-4">More premium shadow bays available in the selected zone.</p>
                         )}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                         <div className="flex items-center justify-between mb-4">
                           <div>
                             <div className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Premium Fee</div>
                             <p className="text-sm font-bold text-slate-700">+{Math.round((shadowOptions[0]?.shadowPremium || 0.25) * 100)}% additional over base rate</p>
                           </div>
                           <button
                             onClick={() => setShowShadowOnly(prev => !prev)}
                             className="text-xs uppercase tracking-[0.3em] font-black text-slate-700 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 transition"
                           >
                             {showShadowOnly ? 'Show All' : 'Shadow Only'}
                           </button>
                         </div>
                         <p className="text-[12px] text-slate-500 leading-relaxed">Shadow parking creates a premium managed location with flexible payment and reserved spot guarantees for citizens who want faster access.</p>
                      </div>
                   </div>
                 )}

                 {showShadowOnly && shadowOptions.length === 0 && (
                   <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                      No dedicated shadow parking is available for this area yet. Switch back to all parking to continue booking standard bays.
                   </div>
                 )}

                 <div className="flex flex-col mx-auto min-w-max bg-[#27272A] p-6 sm:p-10 rounded-xl border-8 border-gray-300 shadow-inner relative overflow-hidden">
                   
                   {/* Asphalt texture / grain */}
                   <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

                   {parkingLanes.map((lane, lIdx) => {
                     // Lane 0 & 2 face down (opening at bottom)
                     // Lane 1 & 3 face up (opening at top)
                     const isTopFacingDown = lIdx % 2 === 0;

                     return (
                      <div key={lane.id} className="flex flex-col relative z-10 w-full mb-1">
                         
                         {/* Draw the road/aisle if it's the 2nd/4th lane - spacing them apart */}
                         {lIdx > 0 && lIdx % 2 === 0 && (
                            <div className="h-24 w-full flex items-center justify-center relative">
                               <div className="absolute w-full border-t-4 border-dashed border-yellow-400 opacity-60"></div>
                               <div className="bg-[#18181B] border border-gray-600 text-white px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded shadow-lg z-10 opacity-70">
                                  DRIVEWAY ➜
                               </div>
                            </div>
                         )}

                         <div className="flex justify-center relative w-full">
                           {/* Lane Label */}
                           <div className="absolute -left-12 inset-y-0 flex items-center justify-center -rotate-90 text-gray-400 font-black text-[10px] tracking-[0.3em] opacity-80 whitespace-nowrap">
                             {lane.label}
                           </div>

                           {/* Parking spots */}
                           {lane.spots.map((spot, sIdx) => {
                             const isOccupied = spot.status !== 'available';
                             const isSelected = selectedSpot?.spotId === spot.spotId;
                             
                             return (
                               <div 
                                 key={spot.spotId}
                                 onClick={() => !isOccupied && setSelectedSpot(spot)}
                                 className={`${vehicleType === '2-wheeler' ? 'w-10 h-16 sm:w-14 sm:h-20' : 'w-14 h-24 sm:w-20 sm:h-32'} flex items-center justify-center relative cursor-pointer font-bold text-xs sm:text-sm transition-all border-l-4 border-white ${sIdx === 9 ? 'border-r-4' : ''} 
                                   ${spot.isEV ? 'border-emerald-500/60' : isTopFacingDown ? 'border-t-4' : 'border-b-4'}
                                   ${isOccupied 
                                     ? 'bg-red-500/20 cursor-not-allowed border-red-500/10'
                                     : isSelected
                                       ? 'bg-green-500/80 shadow-[0_0_20px_rgba(34,197,94,0.6)] z-10 scale-[1.03] border-green-300'
                                       : spot.isEV ? 'bg-emerald-500/10 hover:bg-emerald-600/30' : 'bg-white/5 hover:bg-green-500/20 hover:border-green-300'
                                   }`}
                               >
                                 {/* Render spot label */}
                                 <span className={`absolute ${isTopFacingDown ? 'top-2' : 'bottom-2'} text-[10px] sm:text-xs font-black tracking-wider 
                                    ${isOccupied ? 'text-red-400' : isSelected ? 'text-white' : spot.isEV ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`}>
                                    {spot.isEV && '⚡'}{spot.displayNum}
                                 </span>

                                 {spot.isShadowParking && !isOccupied && (
                                   <span className="absolute left-1 top-1 text-[8px] font-black uppercase tracking-[0.24em] text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded-sm shadow-sm">
                                     SHADOW
                                   </span>
                                 )}

                                 {/* Occupied indicator - Solid RED block in center representing car */}
                                 {isOccupied && (
                                     <div className={`absolute w-10/12 h-4/5 rounded bg-red-500 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] ${isTopFacingDown ? 'top-3' : 'bottom-3'}`}>
                                        {vehicleType === '2-wheeler' ? (
                                           <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 5.5l.5-.5c.8-.8 1.5-1 2-1s1.2.2 2 1 1 .5 1.5.5.9 0 1.5-.5h.5c0 1.4-1.1 2.5-2.5 2.5s-1.8-.1-2.5-.5-1.1-.5-1.5-.5-.4 0-.8.3l-.7.7c-.1.1-.3.1-.4 0s-.1-.2 0-.4l.5-.6zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-8.8-7l-1.2-3h-2v1h1.4l1.2 3.1c-.4.4-.6.9-.6 1.4 0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4L15.2 12H11.5l1.6-4h-2.1l-2.8 4z"/></svg>
                                        ) : (
                                           <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        )}
                                     </div>
                                 )}

                                 {/* Selected indicator - Solid GREEN block representing user's prospective car */}
                                 {isSelected && !isOccupied && (
                                     <div className={`absolute w-10/12 h-4/5 rounded bg-white flex items-center justify-center shadow-lg animate-pulse ${isTopFacingDown ? 'top-3' : 'bottom-3'}`}>
                                        {vehicleType === '2-wheeler' ? (
                                           <svg className="w-8 h-8 text-green-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 5.5l.5-.5c.8-.8 1.5-1 2-1s1.2.2 2 1 1 .5 1.5.5.9 0 1.5-.5h.5c0 1.4-1.1 2.5-2.5 2.5s-1.8-.1-2.5-.5-1.1-.5-1.5-.5-.4 0-.8.3l-.7.7c-.1.1-.3.1-.4 0s-.1-.2 0-.4l.5-.6zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-8.8-7l-1.2-3h-2v1h1.4l1.2 3.1c-.4.4-.6.9-.6 1.4 0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4L15.2 12H11.5l1.6-4h-2.1l-2.8 4z"/></svg>
                                        ) : (
                                           <svg className="w-8 h-8 text-green-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                                        )}
                                     </div>
                                 )}

                               </div>
                             )
                           })}
                         </div>
                      </div>
                     )
                   })}
                </div>
                
                {/* Legend */}
                <div className="mt-12 mb-8 flex items-center justify-center gap-8 text-xs font-bold text-gray-500 uppercase tracking-widest">
                   <div className="flex items-center gap-2">
                       <div className="w-6 h-4 border-2 border-gray-400 rounded-sm bg-gray-100"></div>
                       Available
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="w-6 h-4 border-2 border-red-500 bg-red-500 rounded-sm flex items-center justify-center text-white">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                       </div>
                       Occupied
                   </div>
                   <div className="flex items-center gap-2">
                       <div className="w-6 h-4 bg-green-500 rounded-sm shadow-sm border border-green-600"></div>
                       Selected
                   </div>
                </div>

              </div>
            ) : (
                <div className="h-64 mt-20 text-center text-gray-400 font-medium flex flex-col items-center justify-center">
                   <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                   Please select an area from the top menu<br />to view the live parking bay.
                </div>
            )}
         </div>
         
      </div>

      {/* Action Bar at bottom */}
      {selectedSpot && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] p-4 flex justify-between items-center z-50 animate-slide-up flex-wrap sm:flex-nowrap gap-4">
          <div className="flex flex-col w-full sm:w-auto pl-2 sm:pl-8 text-center sm:text-left">
             <span className="text-sm font-bold text-gray-500">
               {duration} Hr{duration > 1 ? 's' : ''} • Slot {selectedSpot.displayNum}
             </span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1 mt-0.5">
               <span className="text-2xl font-black text-[#0F172A]">₹{currentBookingSummary?.totalAmount.toFixed(0)}</span>
               <span className="text-xs font-semibold text-gray-400">total cost</span>
            </div>
            {currentBookingSummary?.isShadow && (
              <div className="mt-1 text-[11px] text-amber-600 font-bold uppercase tracking-[0.2em]">
                Shadow premium included (+{Math.round(currentBookingSummary.premiumBreakdown.shadowPremium * 100)}%)
              </div>
            )}
          </div>
          <button 
            onClick={handleBook}
            disabled={loading}
            className="w-full sm:w-auto bg-[#10B981] text-white px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide hover:bg-green-600 transition-transform active:scale-95 shadow-lg hover:shadow-xl sm:mr-8 min-w-[160px] text-center"
          >
            {loading ? (
               <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
               </span>
            ) : `Pay & Book${selectedSpot?.isShadowParking ? ' Shadow' : ''}`}
          </button>
        </div>
      )}

      {paymentContext?.show && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-0">
            <div className="absolute inset-0 bg-[#02042A]/90 backdrop-blur-md transition-opacity" onClick={() => !paymentContext.loading && closePaymentOverlay()}></div>
            <div className="relative w-full max-w-[500px] bg-white rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-up">
               <div className="bg-[#1D2547] text-white p-8 pb-12 relative overflow-hidden text-center">
                  <div className="absolute top-0 right-0 opacity-10"><div className="w-40 h-40 bg-blue-500 rounded-full"></div></div>
                  <div className="flex justify-between items-center mb-8 relative z-10">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                           <span className="text-sm font-black">₹</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Parking Payment Gateway</span>
                     </div>
                     <button onClick={() => !paymentContext.loading && closePaymentOverlay()} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        ✕
                     </button>
                  </div>
                  <div className="relative z-10">
                     <p className="text-[10px] font-black text-blue-300/80 uppercase tracking-[0.3em] mb-2 font-mono">Transaction Amount</p>
                     <h2 className="text-5xl font-black tracking-tighter">₹{paymentContext.amount.toFixed(0)}</h2>
                     <p className="text-sm text-slate-200 mt-2">{paymentContext.description}</p>
                  </div>
               </div>

               {paymentContext.step === 1 && (
                 <div className="p-8 -mt-6 bg-white rounded-t-3xl relative z-20">
                    <div className="flex items-center gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="w-10 h-10 bg-slate-900/5 rounded-2xl flex items-center justify-center text-slate-900">
                         ✓
                       </div>
                       <p className="text-[11px] text-slate-500 leading-tight">Choose a government-certified payment method to settle your parking reservation securely.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                       {[
                         { id: 'upi', label: 'UPI / Wallet', description: 'Instant mobile settlement', color: 'bg-emerald-50 text-emerald-700' },
                         { id: 'card', label: 'Debit / Credit Card', description: 'Bank card authorization', color: 'bg-blue-50 text-blue-700' },
                         { id: 'net', label: 'Net Banking', description: 'Online bank transfer', color: 'bg-slate-50 text-slate-700' }
                       ].map((method) => (
                         <button
                           key={method.id}
                           onClick={handleStartPayment}
                           className={`w-full p-5 rounded-3xl border border-slate-200 text-left ${method.color} hover:shadow-lg transition`}
                         >
                           <div className="flex items-center justify-between gap-3">
                              <div>
                                 <p className="font-black text-sm text-slate-900">{method.label}</p>
                                 <p className="text-[11px] text-slate-500 mt-1">{method.description}</p>
                              </div>
                              <span className="text-slate-400 text-xs uppercase tracking-[0.25em]">Pay</span>
                           </div>
                         </button>
                       ))}
                    </div>
                 </div>
               )}

               {paymentContext.step === 2 && (
                 <div className="p-12 -mt-6 bg-white rounded-t-3xl relative z-20 flex flex-col items-center text-center min-h-[360px] justify-center gap-6">
                    <div className="w-24 h-24 mb-6 relative">
                       <div className={`absolute inset-0 border-4 border-slate-50 rounded-full`}></div>
                       <div className={`absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin ${paymentContext.loading ? 'opacity-100' : 'opacity-0'}`}></div>
                       <div className={`absolute inset-0 flex items-center justify-center ${!paymentContext.loading ? 'scale-100' : 'scale-0'} transition-transform duration-500`}>
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                             <span className="text-3xl">🔒</span>
                          </div>
                       </div>
                    </div>
                    <h4 className="text-2xl font-black text-[#0F172A] mb-3">{paymentContext.loading ? 'Initializing payment gateway...' : 'Confirm Payment'}</h4>
                    <p className="text-sm font-bold text-slate-400 max-w-[300px] leading-relaxed">
                      {paymentContext.loading
                        ? 'Please wait while we connect to your payment network.'
                        : 'Complete authorization using the selected payment method to confirm your booking.'}
                    </p>
                    {!paymentContext.loading && (
                      <button
                        onClick={handleConfirmPayment}
                        className="w-full py-5 bg-[#1A73E8] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition active:scale-95"
                      >
                        Confirm Payment
                      </button>
                    )}
                 </div>
               )}

               {paymentContext.step === 3 && (
                 <div className="p-12 -mt-6 bg-white rounded-t-3xl relative z-20 flex flex-col items-center text-center gap-6">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
                       <span className="text-4xl">✅</span>
                    </div>
                    <h4 className="text-3xl font-black text-[#0F172A] mb-2">Payment Confirmed</h4>
                    <p className="text-sm font-bold text-slate-400 max-w-[340px] leading-relaxed">
                      Your parking reservation is secured and the premium fee has been processed successfully.
                    </p>
                    <div className="bg-slate-50 w-full p-5 rounded-3xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Booking</span>
                         <span className="text-[11px] font-black text-slate-700">{paymentContext.booking?.spotId || paymentContext.spot?.spotId}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                         <span>Total Paid</span>
                         <span className="font-black">₹{paymentContext.amount.toFixed(0)}</span>
                      </div>
                    </div>
                    <button
                      onClick={closePaymentOverlay}
                      className="w-full py-5 bg-[#0F172A] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-900 transition active:scale-95"
                    >
                      Close
                    </button>
                 </div>
               )}
            </div>
         </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up {
           from { transform: translateY(100%); opacity: 0; }
           to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}} />

    </div>
  );
}
