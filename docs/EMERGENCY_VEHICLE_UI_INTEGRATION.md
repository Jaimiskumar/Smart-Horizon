# Emergency Vehicle System - UI Integration Examples

Complete code examples for integrating emergency vehicle system into dashboards and mobile apps.

## Dispatch Center Dashboard Implementation

### HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <title>Emergency Vehicle Dispatch Center</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="dashboard">
    <!-- Active Vehicles Panel -->
    <div class="panel active-vehicles">
      <h2>Active Emergency Vehicles</h2>
      <div id="vehiclesList" class="vehicles-list"></div>
    </div>

    <!-- Map View -->
    <div class="panel map-container">
      <div id="mapContainer"></div>
    </div>

    <!-- Vehicle Details -->
    <div class="panel vehicle-details">
      <h2>Vehicle Status</h2>
      <div id="vehicleStatus"></div>
    </div>

    <!-- Control Panel -->
    <div class="panel controls">
      <h3>Manual Controls</h3>
      <input type="text" id="vehicleId" placeholder="Vehicle ID">
      <button onclick="deactivateCorridor()">Deactivate Corridor</button>
      <button onclick="requestReroute()">Request Reroute</button>
    </div>

    <!-- Notifications -->
    <div id="notificationCenter" class="notification-center"></div>
  </div>

  <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
  <script src="dispatch-dashboard.js"></script>
</body>
</html>
```

### JavaScript Dashboard Logic
```javascript
// dispatch-dashboard.js

const socket = io('http://localhost:5000');
const API_BASE = 'http://localhost:5000/api';
const authToken = localStorage.getItem('authToken');

// State management
const activeVehicles = new Map();

// ============= WebSocket Connections =============

socket.on('emergency_vehicle_detected', (data) => {
  console.log('🚨 Emergency detected:', data);
  
  addNotification(`${data.type.toUpperCase()} Detected`, 'warning', [
    `Location: ${data.location.address}`,
    `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
    `Vehicle ID: ${data.vehicleId}`
  ]);
});

socket.on('emergency_auto_dispatch', (data) => {
  console.log('📤 Auto-dispatched:', data);
  
  activeVehicles.set(data.vehicleId, {
    vehicleId: data.vehicleId,
    type: data.type,
    destination: data.destination,
    route: data.route,
    status: 'in_transit'
  });
  
  updateVehiclesList();
  addNotification('Vehicle Dispatched', 'success', [
    `${data.type} dispatched to ${data.destination.address}`,
    `Green corridor activated`
  ]);
});

socket.on('green_corridor_activated', (data) => {
  console.log('🟢 Corridor activated:', data);
  
  addNotification('Green Corridor Activated', 'info', [
    `${data.signalsCount} signals turned green`,
    `Vehicle: ${data.vehicleId}`
  ]);
});

socket.on('emergency_signal_activated', (data) => {
  console.log('🟢 Signal:', data.signalId, '→ GREEN');
  highlightSignalOnMap(data.signalId, 'green');
});

socket.on('emergency_signal_preparing', (data) => {
  console.log('🟡 Signal:', data.signalId, '→ YELLOW');
  highlightSignalOnMap(data.signalId, 'yellow');
});

socket.on('green_corridor_progress', (data) => {
  console.log('📊 Progress:', data.progressPercentage, '%');
  
  const vehicle = activeVehicles.get(data.vehicleId);
  if (vehicle) {
    vehicle.progressPercentage = data.progressPercentage;
    updateVehiclesList();
  }
});

socket.on('traffic_ahead_detected', (data) => {
  console.log('⚠️ Traffic detected:', data);
  
  addNotification('Traffic Alert', 'warning', [
    `${data.trafficIssuesFound} traffic issues detected`,
    `Vehicle: ${data.vehicleId}`,
    `Auto-rerouting in progress...`
  ], 'persistent');
});

socket.on('emergency_reroute_applied', (data) => {
  console.log('🔄 Rerouted:', data);
  
  const vehicle = activeVehicles.get(data.vehicleId);
  if (vehicle) {
    vehicle.route = data.newRoute;
    vehicle.rerouteCount = data.rerouteCount;
    updateVehiclesList();
  }
  
  removeNotification('persistent');
  addNotification('Reroute Applied', 'success', [
    `Vehicle rerouted to avoid congestion`,
    `Reroute ${data.rerouteCount}: ${data.reason}`,
    `New route length: ${data.newRoute.length} signals`
  ]);
});

socket.on('emergency_location_update', (data) => {
  console.log('📍 Location:', data.location.address);
  
  const vehicle = activeVehicles.get(data.vehicleId);
  if (vehicle) {
    vehicle.location = data.location;
    vehicle.speed = data.speed;
    updateVehiclesList();
    updateMapMarker(data.vehicleId, data.location);
  }
});

socket.on('green_corridor_deactivated', (data) => {
  console.log('⏹️ Corridor deactivated:', data);
  
  const vehicle = activeVehicles.get(data.vehicleId);
  if (vehicle) {
    vehicle.status = 'completed';
    updateVehiclesList();
  }
  
  addNotification('Corridor Deactivated', 'success', [
    `Emergency resolved`,
    `Vehicle: ${data.vehicleId}`,
    `All signals restored to normal`
  ]);
});

// ============= API Functions =============

async function loadActiveVehicles() {
  try {
    const response = await fetch(`${API_BASE}/emergency-vehicles/active`);
    const data = await response.json();
    
    data.vehicles.forEach(vehicle => {
      activeVehicles.set(vehicle.vehicleId, vehicle);
    });
    
    updateVehiclesList();
  } catch (error) {
    console.error('Error loading vehicles:', error);
    addNotification('Error', 'error', ['Failed to load active vehicles']);
  }
}

async function getVehicleStatus(vehicleId) {
  try {
    const response = await fetch(`${API_BASE}/emergency-vehicles/${vehicleId}/status`);
    const data = await response.json();
    
    if (data.success) {
      displayVehicleDetails(data.vehicle);
    }
  } catch (error) {
    console.error('Error getting status:', error);
  }
}

async function deactivateCorridor() {
  const vehicleId = document.getElementById('vehicleId').value;
  if (!vehicleId) {
    alert('Please enter Vehicle ID');
    return;
  }
  
  try {
    const response = await fetch(
      `${API_BASE}/emergency-vehicles/${vehicleId}/deactivate-corridor`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    const data = await response.json();
    if (data.success) {
      addNotification('Success', 'success', ['Corridor deactivated']);
    } else {
      addNotification('Error', 'error', [data.message]);
    }
  } catch (error) {
    console.error('Error:', error);
    addNotification('Error', 'error', ['Failed to deactivate corridor']);
  }
}

async function requestReroute() {
  const vehicleId = document.getElementById('vehicleId').value;
  if (!vehicleId) {
    alert('Please enter Vehicle ID');
    return;
  }
  
  try {
    const response = await fetch(
      `${API_BASE}/emergency-vehicles/${vehicleId}/reroute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Manual dispatch request' })
      }
    );
    
    const data = await response.json();
    if (data.success) {
      addNotification('Reroute', 'success', [
        'New route calculated and applied',
        `Reroute #${data.reroute.rerouteNumber}`
      ]);
    } else {
      addNotification('Cannot Reroute', 'warning', [data.message]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============= UI Functions =============

function updateVehiclesList() {
  const list = document.getElementById('vehiclesList');
  list.innerHTML = '';
  
  activeVehicles.forEach((vehicle, vehicleId) => {
    const vehicleCard = createVehicleCard(vehicle);
    list.appendChild(vehicleCard);
  });
}

function createVehicleCard(vehicle) {
  const card = document.createElement('div');
  card.className = `vehicle-card ${vehicle.status}`;
  card.onclick = () => getVehicleStatus(vehicle.vehicleId);
  
  const statusIcon = {
    'idle': '⏹️',
    'responding': '🚨',
    'in_transit': '🚗',
    'arrived': '✅',
    'completed': '✔️'
  }[vehicle.status] || '❓';
  
  card.innerHTML = `
    <div class="vehicle-header">
      <span class="icon">${statusIcon}</span>
      <span class="vehicle-id">${vehicle.vehicleId}</span>
      <span class="vehicle-type">${vehicle.type}</span>
    </div>
    <div class="vehicle-info">
      <div class="location">📍 ${vehicle.location?.address || 'Unknown'}</div>
      <div class="destination">🏥 ${vehicle.destination?.address || 'Not set'}</div>
      <div class="speed">🚀 ${vehicle.speed || 0} km/h</div>
    </div>
    <div class="corridor-status">
      Corridor: ${vehicle.corridorActive ? '🟢 Active' : '⚪ Inactive'}
    </div>
    ${vehicle.progressPercentage ? `
      <div class="progress-bar">
        <div class="progress" style="width: ${vehicle.progressPercentage}%"></div>
        <span>${vehicle.progressPercentage}%</span>
      </div>
    ` : ''}
  `;
  
  return card;
}

function displayVehicleDetails(vehicle) {
  const container = document.getElementById('vehicleStatus');
  
  container.innerHTML = `
    <div class="details-grid">
      <div class="detail-row">
        <label>Vehicle ID:</label>
        <value>${vehicle.vehicleId}</value>
      </div>
      <div class="detail-row">
        <label>Type:</label>
        <value>${vehicle.type}</value>
      </div>
      <div class="detail-row">
        <label>Status:</label>
        <value>${vehicle.status}</value>
      </div>
      <div class="detail-row">
        <label>Location:</label>
        <value>${vehicle.currentLocation.address}</value>
      </div>
      <div class="detail-row">
        <label>Speed:</label>
        <value>${vehicle.speed.current} km/h (Recommended: ${vehicle.speed.recommended})</value>
      </div>
      <div class="detail-row">
        <label>Destination:</label>
        <value>${vehicle.destination.address}</value>
      </div>
      <div class="detail-row">
        <label>ETA:</label>
        <value>${new Date(vehicle.destination.eta).toLocaleTimeString()}</value>
      </div>
      <div class="detail-row">
        <label>Green Corridor:</label>
        <value>${vehicle.greenCorridor.active ? '🟢 Active' : '⚪ Inactive'}</value>
      </div>
      <div class="detail-row">
        <label>Route Progress:</label>
        <value>${vehicle.route.currentIndex}/${vehicle.route.totalSignals} signals (${vehicle.routeStatus.progressPercentage}%)</value>
      </div>
      <div class="detail-row">
        <label>Reroutes:</label>
        <value>${vehicle.route.rerouteCount}</value>
      </div>
      <div class="detail-row">
        <label>Traffic Ahead:</label>
        <value>${vehicle.trafficAhead.count} issues</value>
      </div>
    </div>
  `;
}

function updateMapMarker(vehicleId, location) {
  // Implementation depends on map library (Google Maps, Leaflet, etc.)
  console.log(`Update marker for ${vehicleId} at`, location);
}

function highlightSignalOnMap(signalId, color) {
  // Implementation depends on map library
  console.log(`Highlight signal ${signalId} as ${color}`);
}

function addNotification(title, type, messages, category = 'normal') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  if (category === 'persistent') {
    notification.id = 'persistent';
  }
  
  notification.innerHTML = `
    <div class="notification-header">
      <strong>${title}</strong>
      <button onclick="this.parentElement.parentElement.remove()" class="close">×</button>
    </div>
    <div class="notification-body">
      ${messages.map(msg => `<div>${msg}</div>`).join('')}
    </div>
  `;
  
  document.getElementById('notificationCenter').appendChild(notification);
  
  // Auto-remove after 5 seconds (unless persistent)
  if (category !== 'persistent') {
    setTimeout(() => notification.remove(), 5000);
  }
}

function removeNotification(category) {
  const notification = document.getElementById(category);
  if (notification) {
    notification.remove();
  }
}

// ============= Initialization =============

document.addEventListener('DOMContentLoaded', () => {
  loadActiveVehicles();
  
  // Refresh vehicle list every 10 seconds
  setInterval(loadActiveVehicles, 10000);
});

socket.on('connect', () => {
  console.log('✅ Connected to emergency system');
  addNotification('Connected', 'success', ['Dispatch center connected to emergency system']);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
  addNotification('Disconnected', 'error', ['Connection lost. Reconnecting...']);
});
```

### CSS Styling
```css
/* style.css */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a1a;
  color: #fff;
}

.dashboard {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 20px;
  padding: 20px;
  height: 100vh;
  overflow: hidden;
}

.panel {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.panel h2 {
  margin-bottom: 15px;
  border-bottom: 2px solid #ff6b6b;
  padding-bottom: 10px;
}

.active-vehicles {
  grid-column: 1;
  grid-row: 1 / 3;
  max-height: 50vh;
}

.map-container {
  grid-column: 2;
  grid-row: 1 / 4;
  padding: 0;
}

#mapContainer {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  border-radius: 8px;
}

.vehicle-details {
  grid-column: 3;
  grid-row: 1 / 3;
  max-height: 50vh;
}

.controls {
  grid-column: 1 / 3;
  grid-row: 3;
  display: flex;
  gap: 10px;
  align-items: center;
}

.controls input {
  flex: 1;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
}

.controls button {
  padding: 10px 15px;
  background: #ff6b6b;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-weight: bold;
}

.controls button:hover {
  background: #ff5252;
}

.vehicle-card {
  background: #3a3a3a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.vehicle-card:hover {
  background: #4a4a4a;
  border-color: #ff6b6b;
  transform: translateX(5px);
}

.vehicle-card.in_transit {
  border-left: 4px solid #4CAF50;
}

.vehicle-card.responding {
  border-left: 4px solid #ff9800;
}

.vehicle-card.completed {
  border-left: 4px solid #2196F3;
}

.vehicle-header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
}

.vehicle-id {
  color: #4CAF50;
}

.vehicle-type {
  text-transform: capitalize;
  color: #99ccff;
  font-size: 14px;
}

.vehicle-info {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.location, .destination, .speed {
  margin: 3px 0;
}

.corridor-status {
  font-size: 12px;
  padding: 5px;
  background: #1a1a1a;
  border-radius: 3px;
  margin-bottom: 5px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #1a1a1a;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s;
}

.progress-bar span {
  position: absolute;
  right: 5px;
  top: -15px;
  font-size: 10px;
  color: #aaa;
}

.notification-center {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  max-width: 300px;
}

.notification {
  background: #3a3a3a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 12px;
  animation: slideIn 0.3s ease-out;
}

.notification-success {
  border-left: 4px solid #4CAF50;
}

.notification-warning {
  border-left: 4px solid #ff9800;
}

.notification-error {
  border-left: 4px solid #f44336;
}

.notification-info {
  border-left: 4px solid #2196F3;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: bold;
}

.notification-body {
  font-size: 12px;
  color: #aaa;
}

.notification-body div {
  margin: 4px 0;
}

.close {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 18px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px;
  background: #3a3a3a;
  border-radius: 4px;
  font-size: 12px;
}

.detail-row label {
  font-weight: bold;
  color: #99ccff;
}

.detail-row value {
  color: #aaa;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .dashboard {
    grid-template-columns: 1fr 1fr;
  }
  
  .active-vehicles {
    grid-column: 1;
  }
  
  .map-container {
    grid-column: 2;
    grid-row: 1 / 4;
  }
  
  .vehicle-details {
    grid-column: 1;
  }
}
```

## Mobile App Implementation (React Native)

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io } from 'socket.io-client-react-native';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export default function EmergencyVehicleApp() {
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize WebSocket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Load initial data
    loadActiveVehicles();

    // Setup WebSocket listeners
    newSocket.on('emergency_vehicle_detected', (data) => {
      addNotification(`${data.type} Detected`, 'warning');
    });

    newSocket.on('green_corridor_activated', (data) => {
      addNotification(`Corridor Activated`, 'success');
    });

    newSocket.on('emergency_location_update', (data) => {
      setActiveVehicles(prev =>
        prev.map(v =>
          v.vehicleId === data.vehicleId
            ? { ...v, location: data.location, speed: data.speed }
            : v
        )
      );
    });

    newSocket.on('emergency_reroute_applied', (data) => {
      addNotification(`Rerouted: ${data.reason}`, 'info');
    });

    return () => newSocket.close();
  }, []);

  const loadActiveVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/emergency-vehicles/active`);
      setActiveVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const getVehicleStatus = async (vehicleId) => {
    try {
      const response = await axios.get(`${API_BASE}/emergency-vehicles/${vehicleId}/status`);
      setSelectedVehicle(response.data.vehicle);
    } catch (error) {
      Alert.alert('Error', 'Failed to load vehicle status');
    }
  };

  const addNotification = (message, type) => {
    const notification = { id: Date.now(), message, type };
    setNotifications(prev => [notification, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 18.5234,
          longitude: 73.8567,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {activeVehicles.map((vehicle) => (
          <Marker
            key={vehicle.vehicleId}
            coordinate={{
              latitude: vehicle.location?.latitude || 18.5234,
              longitude: vehicle.location?.longitude || 73.8567,
            }}
            title={vehicle.vehicleId}
            description={vehicle.type}
            onPress={() => getVehicleStatus(vehicle.vehicleId)}
          />
        ))}
      </MapView>

      {/* Active Vehicles List */}
      <View style={styles.vehiclesList}>
        <Text style={styles.title}>Active Vehicles</Text>
        <FlatList
          data={activeVehicles}
          keyExtractor={(item) => item.vehicleId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.vehicleCard}
              onPress={() => getVehicleStatus(item.vehicleId)}
            >
              <Text style={styles.vehicleId}>{item.vehicleId}</Text>
              <Text style={styles.vehicleType}>{item.type}</Text>
              <Text style={styles.vehicleStatus}>{item.status}</Text>
              <Text style={styles.vehicleLocation}>📍 {item.location?.address}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <View style={styles.detailsModal}>
          <Text style={styles.detailsTitle}>{selectedVehicle.vehicleId}</Text>
          <Text>Type: {selectedVehicle.type}</Text>
          <Text>Status: {selectedVehicle.status}</Text>
          <Text>Location: {selectedVehicle.currentLocation?.address}</Text>
          <Text>Speed: {selectedVehicle.speed?.current} km/h</Text>
          <Text>ETA: {new Date(selectedVehicle.destination?.eta).toLocaleTimeString()}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedVehicle(null)}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications */}
      {notifications.map((notif) => (
        <View key={notif.id} style={[styles.notification, styles[`notification${notif.type}`]]}>
          <Text style={styles.notificationText}>{notif.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 0.6,
  },
  vehiclesList: {
    flex: 0.4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  vehicleCard: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
  },
  vehicleId: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#4CAF50',
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  vehicleStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  vehicleLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  detailsModal: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 300,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  notification: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  notificationsuccess: {
    backgroundColor: '#4CAF50',
  },
  notificationwarning: {
    backgroundColor: '#ff9800',
  },
  notificationerror: {
    backgroundColor: '#f44336',
  },
  notificationinfo: {
    backgroundColor: '#2196F3',
  },
  notificationText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
```

---

## Integration Summary

These examples provide:

✅ **Real-time Updates** - WebSocket events update instantly
✅ **Vehicle Management** - Register, dispatch, track vehicles
✅ **Interactive Map** - Visualize vehicle locations and routes
✅ **Notifications** - Real-time alerts and status updates
✅ **Statistics** - Performance metrics and analytics
✅ **Mobile Support** - React Native implementation
✅ **Responsive Design** - Works on all screen sizes

Add these to your existing dashboard/app UI and integrate the emergency vehicle system!
