/**
 * Weather-Based Traffic Signal Optimization Service
 * Adjusts signal timing based on real-time weather conditions
 * - Temperature > 45°C: Reduced waiting times (faster flow)
 * - Rainy season: Adjusted timing for safety
 * - Cross-zone synchronization
 */

import TrafficSignal from '../models/TrafficSignal.js';
import { io } from '../server.js';

export class WeatherAdaptiveSignal {
  constructor() {
    this.weatherApiUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather';
    this.weatherApiKey = process.env.WEATHER_API_KEY || 'demo';
    this.updateInterval = 60000; // 1 minute
    this.zoneWeatherCache = new Map();
  }

  /**
   * Get weather data for a location
   */
  async getWeatherData(lat, lng) {
    try {
      const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      
      // Check cache first
      const cached = this.zoneWeatherCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 600000) {
        return cached.data;
      }

      // Fetch from API (or use demo data if API key is 'demo')
      let weatherData;
      
      if (this.weatherApiKey === 'demo') {
        // Demo data for testing
        weatherData = this._generateDemoWeather(lat, lng);
      } else {
        const response = await fetch(
          `${this.weatherApiUrl}?lat=${lat}&lon=${lng}&appid=${this.weatherApiKey}&units=metric`
        );
        
        if (!response.ok) {
          throw new Error(`Weather API error: ${response.statusText}`);
        }
        
        weatherData = await response.json();
      }

      // Cache the result
      this.zoneWeatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Weather data fetch error:', error);
      return this._generateDemoWeather(lat, lng);
    }
  }

  /**
   * Calculate adjusted signal timings based on weather
   */
  calculateAdaptiveTimings(baseTimings, weatherData) {
    const adjustedTimings = { ...baseTimings };
    
    // Extract weather metrics
    const temperature = weatherData.main?.temp || 25;
    const humidity = weatherData.main?.humidity || 50;
    const isRaining = this._isRaining(weatherData);
    const windSpeed = weatherData.wind?.speed || 0;

    console.log(`🌡️ Weather conditions - Temp: ${temperature}°C, Is Raining: ${isRaining}`);

    // ========== TEMPERATURE-BASED ADJUSTMENTS ==========
    if (temperature > 45) {
      // Extreme heat: Reduce waiting times to minimize traffic jams
      // People want to get to air-conditioned spaces faster
      adjustedTimings.green = Math.max(15, baseTimings.green - 10);
      adjustedTimings.red = baseTimings.red - 5;
      console.log(`🔥 Extreme heat detected - Reduce cycle time`);
    } else if (temperature > 40) {
      // Hot: Slight reduction
      adjustedTimings.green = Math.max(20, baseTimings.green - 5);
      adjustedTimings.red = baseTimings.red - 2;
      console.log(`🥵 Hot weather - Slight time reduction`);
    } else if (temperature < 0) {
      // Very cold: Increase timing for safety (slower speeds)
      adjustedTimings.green = baseTimings.green + 8;
      adjustedTimings.red = baseTimings.red + 3;
      console.log(`❄️ Cold weather - Increase cycle time for safety`);
    }

    // ========== RAIN-BASED ADJUSTMENTS ==========
    if (isRaining) {
      // Rainy: Increase all timings for safety
      // - Reduced visibility
      // - Longer braking distance
      // - Slower vehicle speeds
      adjustedTimings.green = baseTimings.green + 10;
      adjustedTimings.yellow = baseTimings.yellow + 3; // Extra buffer
      adjustedTimings.red = baseTimings.red + 10;
      console.log(`🌧️ Rainy conditions - Increase cycle time`);
    }

    // ========== HUMIDITY-BASED MICRO-ADJUSTMENTS ==========
    if (humidity > 80) {
      // Very high humidity: Slight increase (visibility issues)
      adjustedTimings.yellow = Math.max(5, adjustedTimings.yellow + 1);
    }

    // ========== WIND-BASED ADJUSTMENTS ==========
    if (windSpeed > 40) {
      // Strong wind: Increase timing for stability
      adjustedTimings.green = baseTimings.green + 5;
    }

    // Ensure minimums and maximums
    adjustedTimings.green = Math.max(15, Math.min(90, adjustedTimings.green));
    adjustedTimings.yellow = Math.max(5, Math.min(15, adjustedTimings.yellow));
    adjustedTimings.red = Math.max(15, Math.min(90, adjustedTimings.red));

    return {
      adjustedTimings,
      weatherFactors: {
        temperature,
        humidity,
        isRaining,
        windSpeed,
        adaptationReason: this._getAdaptationReason(temperature, isRaining, humidity, windSpeed)
      }
    };
  }

  /**
   * Update all signals across zones based on weather
   */
  async updateAllSignalsForWeather() {
    try {
      const signals = await TrafficSignal.find({ status: { $ne: 'offline' } });

      for (const signal of signals) {
        const weatherData = await this.getWeatherData(
          signal.location.lat,
          signal.location.lng
        );

        const { adjustedTimings, weatherFactors } = this.calculateAdaptiveTimings(
          signal.timings,
          weatherData
        );

        // Update signal with new timings
        await TrafficSignal.findByIdAndUpdate(
          signal._id,
          {
            timings: adjustedTimings,
            weatherMetrics: {
              temperature: weatherFactors.temperature,
              humidity: weatherFactors.humidity,
              isRaining: weatherFactors.isRaining,
              windSpeed: weatherFactors.windSpeed,
              adaptationReason: weatherFactors.adaptationReason,
              updatedAt: new Date()
            }
          },
          { new: true }
        );

        // Broadcast update via WebSocket
        io.emit('signal_weather_update', {
          signalId: signal.signalId,
          zone: signal.location.name,
          adjustedTimings,
          weatherFactors,
          timestamp: new Date()
        });

        console.log(`✅ Updated signal ${signal.signalId} based on weather`);
      }
    } catch (error) {
      console.error('Error updating signals for weather:', error);
    }
  }

  /**
   * Sync weather-based timings across all zones
   */
  async syncTimingsAcrossZones() {
    try {
      const zones = await this._getUniquZones();
      const zoneTimings = new Map();

      for (const zone of zones) {
        const signals = await TrafficSignal.find({ location: { name: zone } });
        
        if (signals.length > 0) {
          // Use first signal's weather data for the zone
          const weatherData = await this.getWeatherData(
            signals[0].location.lat,
            signals[0].location.lng
          );

          const { adjustedTimings } = this.calculateAdaptiveTimings(
            signals[0].timings,
            weatherData
          );

          zoneTimings.set(zone, adjustedTimings);

          // Apply same timings to all signals in zone
          for (const signal of signals) {
            await TrafficSignal.findByIdAndUpdate(signal._id, {
              timings: adjustedTimings,
              syncedZone: zone,
              syncedAt: new Date()
            });
          }
        }
      }

      // Broadcast zone-wide synchronization
      io.emit('zone_timings_synced', {
        zones: Array.from(zoneTimings.entries()),
        timestamp: new Date()
      });

      console.log(`✅ Synced timings across ${zones.length} zones`);
    } catch (error) {
      console.error('Error syncing timings across zones:', error);
    }
  }

  /**
   * Get real-time weather forecast for traffic prediction
   */
  async getWeatherForecast(lat, lng, hours = 3) {
    try {
      const weatherData = await this.getWeatherData(lat, lng);
      
      const forecast = {
        current: {
          temp: weatherData.main?.temp,
          description: weatherData.weather?.[0]?.description,
          isRaining: this._isRaining(weatherData)
        },
        prediction: {
          nextHours: hours,
          expectedTemperatureChange: this._predictTempChange(weatherData),
          rainProbability: this._getRainProbability(weatherData),
          recommendedSignalAdjustment: this._getRecommendedAdjustment(weatherData)
        }
      };

      return forecast;
    } catch (error) {
      console.error('Weather forecast error:', error);
      return null;
    }
  }

  // ========== HELPER METHODS ==========

  _isRaining(weatherData) {
    const conditions = weatherData.weather || [];
    return conditions.some(c => 
      ['rain', 'thunderstorm', 'drizzle'].includes(c.main.toLowerCase())
    );
  }

  _generateDemoWeather(lat, lng) {
    // Realistic demo weather data
    const hour = new Date().getHours();
    const temp = 20 + Math.sin(hour / 24 * Math.PI) * 15 + Math.random() * 5;
    const rainChance = Math.random();

    return {
      main: {
        temp: Math.round(temp * 10) / 10,
        humidity: 40 + Math.random() * 40,
        feels_like: temp - 2
      },
      weather: rainChance > 0.7 ? 
        [{ main: 'Rain', description: 'light rain' }] : 
        [{ main: 'Clear', description: 'clear sky' }],
      wind: {
        speed: Math.random() * 20
      }
    };
  }

  _getAdaptationReason(temp, isRaining, humidity, windSpeed) {
    const reasons = [];
    
    if (temp > 45) reasons.push('Extreme heat - fast cycle');
    if (temp > 40) reasons.push('Hot - reduced timing');
    if (temp < 0) reasons.push('Cold - safety priority');
    if (isRaining) reasons.push('Rain - increased safety buffer');
    if (humidity > 80) reasons.push('High humidity - visibility');
    if (windSpeed > 40) reasons.push('Strong wind - stability');

    return reasons.length > 0 ? reasons.join(', ') : 'Normal conditions';
  }

  _predictTempChange(weatherData) {
    // Simple prediction based on current conditions
    const current = weatherData.main?.temp || 25;
    const hour = new Date().getHours();
    
    // Temperature typically peaks at 2 PM, lowest at 5 AM
    if (hour < 14) {
      return { expected: current + (14 - hour) * 0.5, trend: 'increasing' };
    } else {
      return { expected: current - (hour - 14) * 0.5, trend: 'decreasing' };
    }
  }

  _getRainProbability(weatherData) {
    if (this._isRaining(weatherData)) return 0.8 + Math.random() * 0.2;
    
    const humidity = weatherData.main?.humidity || 50;
    return (humidity - 50) / 100; // Rough estimate based on humidity
  }

  _getRecommendedAdjustment(weatherData) {
    const temp = weatherData.main?.temp || 25;
    const isRaining = this._isRaining(weatherData);

    if (temp > 45) return 'reduce_20%';
    if (temp > 40) return 'reduce_10%';
    if (isRaining) return 'increase_20%';
    if (temp < 0) return 'increase_15%';
    return 'normal';
  }

  async _getUniquZones() {
    const signals = await TrafficSignal.find();
    const zones = new Set();
    signals.forEach(s => zones.add(s.location.name));
    return Array.from(zones);
  }

  /**
   * Start automatic weather monitoring
   */
  startWeatherMonitoring() {
    console.log('🌡️ Starting weather-based signal optimization...');
    
    // Update every minute
    setInterval(() => this.updateAllSignalsForWeather(), this.updateInterval);
    
    // Sync across zones every 5 minutes
    setInterval(() => this.syncTimingsAcrossZones(), 300000);
  }
}

export const weatherAdaptiveSignal = new WeatherAdaptiveSignal();
