/**
 * Weather Adaptive Signal Routes
 * API endpoints for weather-based signal timing management
 */

import express from 'express';
import { WeatherAdaptiveSignal } from '../services/weatherAdaptiveSignal.js';
import { adminCitizenSyncService } from '../services/adminCitizenSyncService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const weatherService = new WeatherAdaptiveSignal();

/**
 * GET /api/weather-signals/:signalId
 * Get signal with current weather-adjusted timings
 */
router.get('/:signalId', authMiddleware, async (req, res) => {
  try {
    const { signalId } = req.params;
    
    // Get signal from database
    const signal = await TrafficSignal.findOne({ signalId });
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    // Get current weather data if location available
    let weatherData = null;
    let adaptedTimings = signal.timings;

    if (signal.location?.lat && signal.location?.lng) {
      try {
        weatherData = await weatherService.getWeatherData(
          signal.location.lat,
          signal.location.lng
        );

        // Calculate adapted timings based on weather
        adaptedTimings = weatherService.calculateAdaptiveTimings(
          signal.timings,
          weatherData
        );
      } catch (error) {
        console.warn(`Weather data unavailable for ${signalId}:`, error.message);
      }
    }

    res.json({
      signal: {
        signalId: signal.signalId,
        name: signal.name,
        location: signal.location,
        currentStatus: signal.status,
        currentTimer: signal.currentTimer,
        timings: {
          baseTimings: signal.timings,
          adaptedTimings
        },
        weatherMetrics: signal.weatherMetrics || null,
        congestionLevel: signal.congestionLevel,
        vehicleCount: signal.vehicleCount
      },
      weather: weatherData,
      syncedZone: signal.syncedZone || null
    });
  } catch (error) {
    console.error('Error fetching signal with weather:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/weather-signals/zone/:zoneId
 * Get all signals in a zone with weather data
 */
router.get('/zone/:zoneId', authMiddleware, async (req, res) => {
  try {
    const { zoneId } = req.params;

    const signals = await TrafficSignal.find({ 
      $or: [
        { syncedZone: zoneId },
        { 'location.address': new RegExp(zoneId, 'i') }
      ]
    });

    if (signals.length === 0) {
      return res.status(404).json({ message: 'No signals found in zone' });
    }

    // Get weather data for first signal (assuming zone has same weather)
    let weatherData = null;
    if (signals[0].location?.lat && signals[0].location?.lng) {
      try {
        weatherData = await weatherService.getWeatherData(
          signals[0].location.lat,
          signals[0].location.lng
        );
      } catch (error) {
        console.warn('Weather data unavailable:', error.message);
      }
    }

    const signalsWithTimings = signals.map(signal => ({
      signalId: signal.signalId,
      name: signal.name,
      status: signal.status,
      timings: weatherData 
        ? weatherService.calculateAdaptiveTimings(signal.timings, weatherData)
        : signal.timings,
      weatherMetrics: signal.weatherMetrics
    }));

    res.json({
      zone: zoneId,
      signalCount: signals.length,
      weather: weatherData,
      signals: signalsWithTimings
    });
  } catch (error) {
    console.error('Error fetching zone signals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/weather-signals/update-weather
 * Manually trigger weather-based signal updates
 * Admin only
 */
router.post('/update-weather', authMiddleware, async (req, res) => {
  try {
    // Verify admin access
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { zoneId } = req.body;

    // Update all signals for weather
    const updatedCount = await weatherService.updateAllSignalsForWeather(zoneId);

    // Broadcast update via Socket.IO
    await adminCitizenSyncService.syncZoneUpdate(
      zoneId,
      'weather_signal_update',
      {
        signalsUpdated: updatedCount,
        timestamp: new Date()
      }
    );

    res.json({
      success: true,
      signalsUpdated: updatedCount,
      zone: zoneId,
      message: 'Weather-based signal timings updated'
    });
  } catch (error) {
    console.error('Error updating weather signals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/weather-signals/sync-zones
 * Synchronize signal timings across all zones
 * Admin only
 */
router.post('/sync-zones', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Sync timings across zones
    const result = await weatherService.syncTimingsAcrossZones();

    // Broadcast to all connected clients
    await adminCitizenSyncService.syncZoneUpdate(
      'all',
      'zone_sync_complete',
      {
        zonesSync: result.zonesUpdated,
        signalsSync: result.signalsUpdated
      }
    );

    res.json({
      success: true,
      zonesUpdated: result.zonesUpdated,
      signalsUpdated: result.signalsUpdated,
      message: 'Zone synchronization completed'
    });
  } catch (error) {
    console.error('Error syncing zones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/weather-signals/forecast/:lat/:lng
 * Get weather forecast for signal location (next 3 hours)
 */
router.get('/forecast/:lat/:lng', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.params;

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const forecast = await weatherService.getWeatherForecast(latitude, longitude, 3);

    res.json({
      location: { lat: latitude, lng: longitude },
      forecastHours: 3,
      forecast
    });
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/weather-signals/monitoring
 * Get all signals with real-time weather monitoring status
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const signals = await TrafficSignal.find({ isActive: true });

    const signalsWithWeather = await Promise.all(
      signals.map(async (signal) => {
        let weatherData = null;
        if (signal.location?.lat && signal.location?.lng) {
          try {
            weatherData = await weatherService.getWeatherData(
              signal.location.lat,
              signal.location.lng
            );
          } catch (error) {
            console.warn(`Weather unavailable for ${signal.signalId}`);
          }
        }

        return {
          signalId: signal.signalId,
          name: signal.name,
          location: signal.location,
          status: signal.status,
          congestionLevel: signal.congestionLevel,
          weather: weatherData,
          weatherMetrics: signal.weatherMetrics,
          syncedZone: signal.syncedZone
        };
      })
    );

    res.json({
      totalSignals: signals.length,
      activeSignals: signals.filter(s => s.isActive).length,
      signals: signalsWithWeather
    });
  } catch (error) {
    console.error('Error fetching weather signals monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
