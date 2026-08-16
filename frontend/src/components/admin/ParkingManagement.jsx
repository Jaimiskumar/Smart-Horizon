import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const LANE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/* ── Single Slot Card ── */
function SlotCard({ slot }) {
  const bgClass =
    slot.status === 'occupied' || slot.status === 'reserved'
      ? 'bg-[#EF4444]'
      : 'bg-[#1E293B]';

  const isOccupied = slot.status === 'occupied' || slot.status === 'reserved';

  return (
    <div
      className={`${bgClass} w-[72px] h-[90px] rounded-md border border-[#374151] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150 hover:brightness-125 hover:scale-[1.04]`}
    >
      <span className="text-[10px] text-white font-mono font-bold tracking-wide opacity-90">
        {slot.displayId}
      </span>
      {isOccupied && (
        <span className="text-white text-xl leading-none font-bold">×</span>
      )}
    </div>
  );
}

/* ── Driveway Divider ── */
function DrivewayDivider() {
  return (
    <div className="relative flex items-center my-3">
      <div className="flex-1 border-t-2 border-dashed border-[#F59E0B]/50"></div>
      <span className="mx-4 text-[10px] font-bold tracking-[0.2em] text-[#F59E0B]/70 uppercase whitespace-nowrap select-none">
        DRIVEWAY →
      </span>
      <div className="flex-1 border-t-2 border-dashed border-[#F59E0B]/50"></div>
    </div>
  );
}

/* ── Lane Row ── */
function LaneRow({ lane }) {
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center justify-center w-6 flex-shrink-0">
        <span
          className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase select-none"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
        >
          {lane.label}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {lane.spots.map((slot) => (
          <SlotCard key={slot.spotId} slot={slot} />
        ))}
      </div>
    </div>
  );
}

export default function ParkingManagement() {
  const [spots, setSpots] = useState([]);
  const [activeZoneName, setActiveZoneName] = useState('');
  const [showAllViolations, setShowAllViolations] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realViolations, setRealViolations] = useState([]);
  const [stats, setStats] = useState({ totalZones: 0, illegalParkingAlerts: 0, revenue: '₹0.0K' });

  useEffect(() => {
    fetchSpots();
    fetchViolations();
    fetchStats();
    
    const socket = io();
    
    socket.on('illegal-parking-detected', () => {
      fetchViolations();
      fetchStats();
    });

    socket.on('illegal-parking-fine-issued', () => {
      fetchViolations();
      fetchStats();
    });

    const interval = setInterval(() => {
      fetchSpots();
      fetchViolations();
      fetchStats();
    }, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchSpots = async () => {
    try {
      const { data } = await axios.get('/api/parking/spots');
      setSpots(data);
      setActiveZoneName(prev => {
        if (!prev && data.length > 0) return data[0].zone;
        return prev;
      });
    } catch (err) {
      console.error('Failed to load spots', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      const { data } = await axios.get('/api/illegal-parking');
      setRealViolations(data);
    } catch (err) {
      console.error('Failed to load violations', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/illegal-parking/stats/summary');
      setStats({
        illegalParkingAlerts: data.total,
        revenue: `₹${(data.collectedAmount / 1000).toFixed(1)}K`
      });
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  /* ── Derive zone list from real API data ── */
  const zonesMap = useMemo(() => {
    const map = {};
    spots.forEach(spot => {
      if (!map[spot.zone]) {
        map[spot.zone] = {
          name: spot.zone,
          pricePerHour: spot.pricePerHour || 20,
          spots: []
        };
      }
      map[spot.zone].spots.push(spot);
    });
    return map;
  }, [spots]);

  const zonesList = useMemo(() => {
    return Object.values(zonesMap).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  }, [zonesMap]);

  const activeZone = zonesMap[activeZoneName];

  /* ── Build lanes from real spots ── */
  const lanes = useMemo(() => {
    if (!activeZone) return [];
    const sorted = [...activeZone.spots].sort((a, b) => a.spotId.localeCompare(b.spotId));
    const result = [];
    for (let i = 0; i < sorted.length; i += 10) {
      const lIdx = Math.floor(i / 10);
      const letter = LANE_LABELS[lIdx] || String.fromCharCode(65 + lIdx);
      const chunk = sorted.slice(i, i + 10).map((s, j) => ({
        ...s,
        displayId: `${letter}${String(j + 1).padStart(2, '0')}`
      }));
      result.push({ lane: letter, label: `LANE ${letter}`, spots: chunk });
    }
    return result;
  }, [activeZone]);

  /* ── Computed stats ── */
  const totalSlots = activeZone?.spots.length || 0;
  const occupiedSlots = activeZone?.spots.filter(s => s.status !== 'available').length || 0;
  const availableSlots = totalSlots - occupiedSlots;

  /* ── Derive zone number for activity/violation mock text ── */
  const zoneNum = activeZoneName?.replace(/\D/g, '') || '1';

  const activities = useMemo(() => [
    { id: 1, text: `Vehicle MH-13-AB-${4800 + Number(zoneNum)} parked at ${activeZoneName}, Slot A03`, time: 'Just now', color: 'bg-[#10B981]' },
    { id: 2, text: `Unauthorized parking detected at ${activeZoneName}, Slot B08`, time: '2 mins ago', color: 'bg-[#EF4444]' },
    { id: 3, text: `Vehicle MH-12-PQ-${9000 + Number(zoneNum)} exited ${activeZoneName}`, time: '5 mins ago', color: 'bg-[#F59E0B]' },
    { id: 4, text: `Booking confirmed for MH-13-CZ-${1100 + Number(zoneNum)}`, time: '12 mins ago', color: 'bg-[#10B981]' },
  ], [activeZoneName, zoneNum]);

  const violations = useMemo(() => {
    // Filter real violations by location/zone if needed, or show all categorized
    return realViolations.map(v => ({
      id: v.id,
      slot: v.cameraId || 'N/A',
      vehicleNo: v.licensePlate,
      duration: v.location, // Using location as duration label since local duration isn't clearly in model
      status: v.status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      time: new Date(v.detectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }, [realViolations]);

  const illegalAlerts = stats.illegalParkingAlerts;
  const revenue = stats.revenue;

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0F172A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading parking data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-6 font-sans text-[#0F172A] relative">
      {/* Top Row: 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">Total Zones</p>
            <h2 className="text-3xl font-bold mt-1 tabular-nums">{zonesList.length}</h2>
          </div>
          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium tracking-wide">Occupied Slots ({activeZoneName})</p>
              <h2 className="text-3xl font-bold mt-1 tabular-nums">{occupiedSlots} <span className="text-lg text-gray-400 font-normal">/ {totalSlots}</span></h2>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#EF4444] h-2 rounded-full" style={{ width: `${totalSlots ? (occupiedSlots / totalSlots) * 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">Illegal Parking Alerts</p>
            <h2 className="text-3xl font-bold mt-1 tabular-nums">{illegalAlerts}</h2>
          </div>
          <div className="px-3 py-1 bg-red-100 text-[#EF4444] rounded-full text-xs font-bold tracking-wide">
            +{(Number(zoneNum) % 4) + 1} NEW
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">Revenue Today</p>
            <h2 className="text-3xl font-bold mt-1 tabular-nums">{revenue}</h2>
          </div>
          <div className="flex items-center text-[#10B981] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
             <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
             <span className="font-bold text-sm">{(Number(zoneNum) % 5) + 2}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ═══════════ LEFT COLUMN: Zone Tabs + Lane Map ═══════════ */}
        <div className="lg:w-[55%] flex flex-col gap-4">
          {/* Zone pill tabs */}
          <div className="flex gap-2 mb-2 flex-wrap">
             {zonesList.map(z => (
               <button 
                  key={z.name}
                  onClick={() => setActiveZoneName(z.name)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${activeZoneName === z.name ? 'font-semibold bg-[#0F172A] text-white shadow-md' : 'font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'}`}
               >
                 {z.name}
               </button>
             ))}
          </div>

          {/* ── Parking Bay Map ── */}
          <div className="flex-1 bg-[#111827] rounded-xl shadow-lg p-6 flex flex-col border border-slate-700/50 min-h-[420px] overflow-x-auto">
            {lanes.length > 0 ? (
              <div className="flex flex-col gap-1 min-w-max">
                {lanes.map((lane, laneIdx) => (
                  <React.Fragment key={lane.lane}>
                    <LaneRow lane={lane} />
                    {laneIdx % 2 === 1 && laneIdx < lanes.length - 1 && (
                      <DrivewayDivider />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-medium">
                No parking spots found for {activeZoneName}
              </div>
            )}

            {/* Legend */}
            <div className="mt-auto pt-5 flex gap-6 border-t border-slate-700/60 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#1E293B] border border-slate-500"></div>
                <span className="text-xs font-medium text-slate-400">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                <span className="text-xs font-medium text-slate-400">Occupied</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT COLUMN: Activity + Violations ═══════════ */}
        <div className="lg:w-[45%] flex flex-col gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex-1">
            <h3 className="font-bold text-lg text-[#0F172A] mb-5">Recent Activity ({activeZoneName})</h3>
            <div className="space-y-5">
              {activities.map((act) => (
                <div key={act.id} className="flex gap-4 items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className={`w-3 h-3 rounded-full ${act.color} mt-1 flex-shrink-0 shadow-sm`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-[#0F172A]">{act.text}</p>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400 font-medium">{act.time}</span>
                      <button onClick={() => setSelectedActivity(act)} className="text-xs font-bold text-[#0F172A] hover:text-[#10B981] uppercase tracking-wider transition-colors">View</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex-1">
            <h3 className="font-bold text-lg text-[#0F172A] mb-4">Active Violations ({activeZoneName})</h3>
            <div className="overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-xs">
                    <th className="pb-3 font-semibold">Camera ID</th>
                    <th className="pb-3 font-semibold">Vehicle No.</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 align-middle">
                  {violations.slice(0, 3).map((v, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5 font-bold text-[#0F172A]">{v.slot}</td>
                      <td className="py-3.5 tabular-nums text-gray-600 font-medium font-mono">{v.vehicleNo}</td>
                      <td className="py-3.5 text-[#0F172A] font-semibold">{v.duration}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap ${v.status === 'Alert Sent' ? 'bg-red-100 text-[#EF4444]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setShowAllViolations(true)} className="w-full mt-4 py-2 border border-gray-200 text-[#0F172A] rounded font-bold text-sm hover:bg-slate-50 transition-colors">
              View All Violations
            </button>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <button onClick={() => setSelectedActivity(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex items-center gap-3 mb-4">
               <div className={`w-4 h-4 rounded-full ${selectedActivity.color}`}></div>
               <h3 className="font-bold text-lg">Activity Details</h3>
            </div>
            <p className="text-gray-700 mb-2">{selectedActivity.text}</p>
            <p className="text-sm text-gray-500 mb-6">Time: {selectedActivity.time}</p>
            <button onClick={() => setSelectedActivity(null)} className="w-full py-2 bg-[#0F172A] text-white rounded font-bold hover:bg-slate-800 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* All Violations Modal */}
      {showAllViolations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 relative max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-[#0F172A]">All Active Violations - {activeZoneName}</h3>
              <button onClick={() => setShowAllViolations(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="overflow-y-auto overflow-x-auto flex-1 pr-2">
              <table className="w-full text-left text-sm min-w-[400px]">
                <thead className="sticky top-0 bg-white shadow-[0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-xs">
                    <th className="pb-3 pt-2 font-semibold">Camera ID</th>
                    <th className="pb-3 pt-2 font-semibold">Vehicle No.</th>
                    <th className="pb-3 pt-2 font-semibold">Location</th>
                    <th className="pb-3 pt-2 font-semibold text-right">Status</th>
                    <th className="pb-3 pt-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 align-middle">
                  {violations.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-bold text-[#0F172A]">{v.slot}</td>
                      <td className="py-4 tabular-nums text-gray-600 font-medium font-mono">{v.vehicleNo}</td>
                      <td className="py-4 text-[#0F172A] font-semibold">{v.duration}</td>
                      <td className="py-4 text-right">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap ${v.status === 'Alert Sent' ? 'bg-red-100 text-[#EF4444]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                         <button className="text-xs font-bold text-white bg-[#EF4444] hover:bg-red-600 px-3 py-1.5 rounded transition-colors">
                           Take Action
                         </button>
                      </td>
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">No active violations in this zone.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
               <button onClick={() => setShowAllViolations(false)} className="px-6 py-2 border border-gray-200 text-[#0F172A] rounded font-bold hover:bg-slate-50 transition-colors">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
