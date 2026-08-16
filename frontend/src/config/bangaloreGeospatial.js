/**
 * Frontend Bangalore Geospatial Intelligence Configuration
 * Provides Bangalore geographic bounds, landmark coordinates, visual categories, and color palettes.
 */

export const BANGALORE_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
  zoom: 12
};

export const CONGESTION_CATEGORIES = {
  GREEN: {
    label: 'Normal Flow',
    colorHex: '#10B981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    minSpeed: 35,
    description: 'Free flow conditions (> 35 km/h)'
  },
  YELLOW: {
    label: 'Moderate Traffic',
    colorHex: '#F59E0B',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-300',
    minSpeed: 25,
    description: 'Slowing traffic (25-35 km/h)'
  },
  ORANGE: {
    label: 'Heavy Congestion',
    colorHex: '#F97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-300',
    minSpeed: 15,
    description: 'Heavy volume backlog (15-25 km/h)'
  },
  RED: {
    label: 'Severe Congestion',
    colorHex: '#EF4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-700',
    borderClass: 'border-red-300',
    minSpeed: 8,
    description: 'Severe bottleneck & queueing (8-15 km/h)'
  },
  DARK_RED: {
    label: 'Critical Gridlock Hotspot',
    colorHex: '#881337',
    bgClass: 'bg-rose-950',
    textClass: 'text-rose-900',
    borderClass: 'border-rose-800',
    minSpeed: 0,
    description: 'Critical gridlock (< 8 km/h) / Multi-Incident block'
  }
};

export const BANGALORE_LANDMARKS = [
  { id: 'BLR-SILK-01', name: 'Silk Board Junction', lat: 12.9176, lng: 77.6238, defaultLevel: 'DARK_RED' },
  { id: 'BLR-ECITY-02', name: 'Electronic City Toll', lat: 12.8452, lng: 77.6602, defaultLevel: 'ORANGE' },
  { id: 'BLR-MARATH-03', name: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974, defaultLevel: 'RED' },
  { id: 'BLR-KRPURAM-04', name: 'KR Puram / Tin Factory', lat: 13.0075, lng: 77.6959, defaultLevel: 'DARK_RED' },
  { id: 'BLR-HEBBAL-05', name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970, defaultLevel: 'RED' },
  { id: 'BLR-BELLANDUR-06', name: 'Outer Ring Road - Bellandur', lat: 12.9304, lng: 77.6784, defaultLevel: 'DARK_RED' },
  { id: 'BLR-WHITEFIELD-07', name: 'Whitefield / Hope Farm', lat: 12.9698, lng: 77.7499, defaultLevel: 'YELLOW' },
  { id: 'BLR-INDIRA-08', name: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408, defaultLevel: 'YELLOW' },
  { id: 'BLR-KORAM-09', name: 'Koramangala Sony World', lat: 12.9352, lng: 77.6245, defaultLevel: 'ORANGE' },
  { id: 'BLR-HSR-10', name: 'HSR Layout 27th Main', lat: 12.9121, lng: 77.6446, defaultLevel: 'GREEN' },
  { id: 'BLR-YESHW-11', name: 'Yeshwanthpur Goraguntepalya', lat: 13.0234, lng: 77.5503, defaultLevel: 'RED' },
  { id: 'BLR-MAJESTIC-12', name: 'Majestic Kempegowda Hub', lat: 12.9767, lng: 77.5713, defaultLevel: 'DARK_RED' },
  { id: 'BLR-AIRPORT-13', name: 'Hebbal - Airport Tollway', lat: 13.0850, lng: 77.6200, defaultLevel: 'GREEN' },
  { id: 'BLR-MGROAD-14', name: 'MG Road / Trinity Circle', lat: 12.9756, lng: 77.6066, defaultLevel: 'ORANGE' },
  { id: 'BLR-SARJAPUR-15', name: 'Sarjapur Road / Wipro Gate', lat: 12.9100, lng: 77.6850, defaultLevel: 'RED' }
];
