<template>
  <div class="visuals-page">
    <video 
      class="background-video" 
      src="/Stars.mp4" 
      autoplay 
      loop 
      muted 
      playsinline
      disablepictureinpicture
      controlslist="nodownload nofullscreen noremoteplayback"
      disableremoteplayback
    ></video>
    
    <header class="header">
      <div class="header-inner">
        <a href="/" class="brand">
          <img src="/canfusion_logo.svg" alt="Logo" class="logo" />
          <span class="brand-name">CanFusion</span>
        </a>

        <nav class="desktop-nav">
          <a href="/" class="nav-link">Grįžti</a>
        </nav>
      </div>
    </header>
    
    <div class="content">
      <h1 class="page-title">CanSat Real-Time Telemetry</h1>
      
      <div class="status-indicators">
        <div class="status-item" :class="{ active: isConnected }">
          <span class="status-dot"></span>
          <span class="status-label">Connected</span>
        </div>
        <div class="status-item" :class="{ active: dataStatus.launched }">
          <span class="status-dot"></span>
          <span class="status-label">Launched</span>
        </div>
        <div class="status-item" :class="{ active: dataStatus.beeper }">
          <span class="status-dot"></span>
          <span class="status-label">Beeper</span>
        </div>
        
        <div class="rssi-indicator">
          RSSI: <span :class="rssiClass">{{ lastRssi }} dBm</span>
        </div>
      </div>
      
      <div class="data-timestamp" v-if="lastTimestamp">
        Last update: {{ formatTime(lastTimestamp) }}
      </div>
      
      <div class="charts-container">
        <div class="chart-wrapper">
          <h2>Temperature</h2>
          <canvas ref="tempChart"></canvas>
        </div>
        
        <div class="chart-wrapper">
          <h2>Humidity</h2>
          <canvas ref="humidityChart"></canvas>
        </div>
        
        <div class="chart-wrapper">
          <h2>Pressure</h2>
          <canvas ref="pressureChart"></canvas>
        </div>
        
        <div class="chart-wrapper">
          <h2>Altitude</h2>
          <canvas ref="altitudeChart"></canvas>
        </div>
        
        <div class="chart-wrapper location-chart">
          <h2>GPS Location</h2>
          <div v-if="hasValidCoordinates" class="gps-data">
            <p>Last Position: {{ lastLat.toFixed(6) }}, {{ lastLng.toFixed(6) }}</p>
            <div class="map-container" ref="mapContainer"></div>
          </div>
          <div v-else class="no-gps-data">
            <p>Waiting for valid GPS coordinates...</p>
          </div>
        </div>
        
        <div class="chart-wrapper">
          <h2>Acceleration</h2>
          <canvas ref="accelChart"></canvas>
        </div>
        
        <div class="chart-wrapper">
          <h2>Light Sensor</h2>
          <canvas ref="photoChart"></canvas>
        </div>
        
        <div class="chart-wrapper">
          <h2>Signal Strength (RSSI)</h2>
          <canvas ref="rssiChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Chart, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

// State variables
const isConnected = ref(false);
const lastRssi = ref(0);
const lastTimestamp = ref(null);
const lastLat = ref(0);
const lastLng = ref(0);
const dataStatus = ref({
  launched: false,
  beeper: false
});

// Chart references
const tempChart = ref(null);
const humidityChart = ref(null);
const pressureChart = ref(null);
const altitudeChart = ref(null);
const accelChart = ref(null);
const photoChart = ref(null);
const rssiChart = ref(null);
const mapContainer = ref(null);

// Chart instances
let tempChartInstance = null;
let humidityChartInstance = null;
let pressureChartInstance = null;
let altitudeChartInstance = null;
let accelChartInstance = null;
let photoChartInstance = null;
let rssiChartInstance = null;
let map = null;
let marker = null;

// Data arrays for charts
const chartData = ref({
  timestamps: [],
  temperature: [],
  humidity: [],
  pressure: [],
  altitude: [],
  acceleration: {
    x: [],
    y: [],
    z: []
  },
  photo: [],
  rssi: [],
  coordinates: []
});

// Maximum number of data points to show
const MAX_DATA_POINTS = 50;

// Computed values
const rssiClass = computed(() => {
  const rssi = lastRssi.value;
  if (rssi > -60) return 'signal-strong';
  if (rssi > -80) return 'signal-medium';
  return 'signal-weak';
});

const hasValidCoordinates = computed(() => {
  return !isNaN(lastLat.value) && !isNaN(lastLng.value) && 
         lastLat.value !== 0 && lastLng.value !== 0;
});

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

// Parse data from the server
function parseData(dataStr, rssi) {
  try {
    const result = {};
    
    // Parse comma-separated values
    const pairs = dataStr.split(',');
    pairs.forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    
    // Set status flags
    dataStatus.value.launched = dataStr.includes('LAUNCHED');
    dataStatus.value.beeper = dataStr.includes('Beeper on');
    
    // Store RSSI
    lastRssi.value = rssi;
    
    // Update timestamp
    lastTimestamp.value = Date.now();
    
    // Update chart data
    updateChartData(result, rssi);
    
    // Update GPS coordinates if valid
    const lat = parseFloat(result.Lat);
    const lng = parseFloat(result.Lng);
    
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      lastLat.value = lat;
      lastLng.value = lng;
      
      // If we have a map, update the marker
      if (map && marker) {
        marker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error parsing data:', err);
    return false;
  }
}

// Update chart data arrays
function updateChartData(data, rssi) {
  const timestamp = new Date().toLocaleTimeString();
  
  // Add new data
  chartData.value.timestamps.push(timestamp);
  chartData.value.temperature.push(parseFloat(data.Temp) || 0);
  chartData.value.humidity.push(parseFloat(data.Humidity) || 0);
  chartData.value.pressure.push(parseFloat(data.Pressure) || 0);
  chartData.value.altitude.push(parseFloat(data.Altitude) || 0);
  chartData.value.acceleration.x.push(parseFloat(data.Gx) || 0);
  chartData.value.acceleration.y.push(parseFloat(data.Gy) || 0);
  chartData.value.acceleration.z.push(parseFloat(data.Gz) || 0);
  chartData.value.photo.push(parseFloat(data.Photo) || 0);
  chartData.value.rssi.push(rssi);
  
  // Limit data points
  if (chartData.value.timestamps.length > MAX_DATA_POINTS) {
    chartData.value.timestamps.shift();
    chartData.value.temperature.shift();
    chartData.value.humidity.shift();
    chartData.value.pressure.shift();
    chartData.value.altitude.shift();
    chartData.value.acceleration.x.shift();
    chartData.value.acceleration.y.shift();
    chartData.value.acceleration.z.shift();
    chartData.value.photo.shift();
    chartData.value.rssi.shift();
  }
  
  // Update all charts
  updateCharts();
}

// Update chart displays
function updateCharts() {
  if (tempChartInstance) {
    tempChartInstance.data.labels = chartData.value.timestamps;
    tempChartInstance.data.datasets[0].data = chartData.value.temperature;
    tempChartInstance.update();
  }
  
  if (humidityChartInstance) {
    humidityChartInstance.data.labels = chartData.value.timestamps;
    humidityChartInstance.data.datasets[0].data = chartData.value.humidity;
    humidityChartInstance.update();
  }
  
  if (pressureChartInstance) {
    pressureChartInstance.data.labels = chartData.value.timestamps;
    pressureChartInstance.data.datasets[0].data = chartData.value.pressure;
    pressureChartInstance.update();
  }
  
  if (altitudeChartInstance) {
    altitudeChartInstance.data.labels = chartData.value.timestamps;
    altitudeChartInstance.data.datasets[0].data = chartData.value.altitude;
    altitudeChartInstance.update();
  }
  
  if (accelChartInstance) {
    accelChartInstance.data.labels = chartData.value.timestamps;
    accelChartInstance.data.datasets[0].data = chartData.value.acceleration.x;
    accelChartInstance.data.datasets[1].data = chartData.value.acceleration.y;
    accelChartInstance.data.datasets[2].data = chartData.value.acceleration.z;
    accelChartInstance.update();
  }
  
  if (photoChartInstance) {
    photoChartInstance.data.labels = chartData.value.timestamps;
    photoChartInstance.data.datasets[0].data = chartData.value.photo;
    photoChartInstance.update();
  }
  
  if (rssiChartInstance) {
    rssiChartInstance.data.labels = chartData.value.timestamps;
    rssiChartInstance.data.datasets[0].data = chartData.value.rssi;
    rssiChartInstance.update();
  }
}

// Initialize all charts
function initializeCharts() {
  // Temperature chart
  tempChartInstance = new Chart(tempChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Temperature (°C)',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
  
  // Humidity chart
  humidityChartInstance = new Chart(humidityChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Humidity (%)',
        data: [],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100
        }
      }
    }
  });
  
  // Pressure chart
  pressureChartInstance = new Chart(pressureChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Pressure (hPa)',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
  
  // Altitude chart
  altitudeChartInstance = new Chart(altitudeChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Altitude (m)',
        data: [],
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // Acceleration chart
  accelChartInstance = new Chart(accelChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'X-Axis',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4
        },
        {
          label: 'Y-Axis',
          data: [],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4
        },
        {
          label: 'Z-Axis',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
  
  // Photo resistor chart
  photoChartInstance = new Chart(photoChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Light Level',
        data: [],
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // RSSI chart
  rssiChartInstance = new Chart(rssiChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Signal Strength (dBm)',
        data: [],
        borderColor: 'rgb(201, 203, 207)',
        backgroundColor: 'rgba(201, 203, 207, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          reverse: true  // Higher values at bottom (worse signal)
        }
      }
    }
  });
}

// Initialize map for GPS visualization
function initializeMap() {
  // Check if Leaflet is available
  if (typeof L !== 'undefined' && mapContainer.value) {
    map = L.map(mapContainer.value).setView([55.1694, 23.8813], 7); // Default view of Lithuania
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add initial marker
    marker = L.marker([55.1694, 23.8813]).addTo(map);
  } else {
    // If Leaflet is not available, load it dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      // Initialize map after Leaflet is loaded
      setTimeout(() => {
        initializeMap();
      }, 100);
    };
    document.head.appendChild(script);
  }
}

// Fetch historical data
async function fetchHistoricalData() {
  try {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await axios.get(`${serverUrl}/data/history?limit=${MAX_DATA_POINTS}`);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Process historical data in reverse order (oldest first)
      response.data.reverse().forEach(item => {
        parseData(item.data, item.rssi);
      });
    }
  } catch (err) {
    console.error('Failed to fetch historical data:', err);
  }
}

// Start data polling (modified to be the primary data source)
function startDataPolling() {
  const pollingInterval = 2000; // 2 seconds
  
  const poll = async () => {
    try {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${serverUrl}/data/latest`);
      
      if (response.data) {
        isConnected.value = true;
        parseData(response.data.data, response.data.rssi);
      }
    } catch (err) {
      console.error('Failed to poll latest data:', err);
      isConnected.value = false;
    }
  };
  
  const pollingTimer = setInterval(poll, pollingInterval);
  
  // Clear interval on component unmount
  onUnmounted(() => {
    clearInterval(pollingTimer);
  });
}

// Lifecycle hooks
onMounted(() => {
  initializeCharts();
  initializeMap();
  fetchHistoricalData();
  
  // Start polling immediately - no waiting for socket failure
  startDataPolling();
});

onUnmounted(() => {
  // Clean up chart instances
  if (tempChartInstance) tempChartInstance.destroy();
  if (humidityChartInstance) humidityChartInstance.destroy();
  if (pressureChartInstance) pressureChartInstance.destroy();
  if (altitudeChartInstance) altitudeChartInstance.destroy();
  if (accelChartInstance) accelChartInstance.destroy();
  if (photoChartInstance) photoChartInstance.destroy();
  if (rssiChartInstance) rssiChartInstance.destroy();
  
  // Clean up map
  if (map) map.remove();
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

.visuals-page {
  min-height: 100vh;
  color: white;
  font-family: 'Orbitron', sans-serif;
  position: relative; /* Add this to create proper stacking context */
}

.background-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-width: 100vw;
  min-height: 100vh;
  object-fit: cover;
  z-index: -1;
  pointer-events: none;
  touch-action: none;
  user-select: none;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  background-color: rgba(15, 23, 42, 0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1.5rem;
  background-color: transparent; /* Added this line to ensure transparency */
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none; /* Add this line to remove the underline */
}

.logo {
  height: 3.5rem;
  width: auto;
}

.brand-name {
  color: #2563eb;
  font-weight: 700;
  font-size: 2rem;
}

.desktop-nav {
  display: flex;
  gap: 2.5rem;
}

.nav-link {
  color: white;
  font-weight: 500;
  font-size: 1.7rem;
  text-decoration: underline;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link:active,
.nav-link:focus {
  color: #2563eb;
  text-decoration: underline;
}

.content {
  padding: 6rem 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #2563eb;
}

.status-indicators {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: rgba(15, 23, 42, 0.7);
  border-radius: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.status-item.active {
  opacity: 1;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ef4444;
}

.status-item.active .status-dot {
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.status-label {
  font-weight: 600;
}

.rssi-indicator {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background-color: rgba(30, 41, 59, 0.7);
}

.signal-strong {
  color: #10b981;
}

.signal-medium {
  color: #f59e0b;
}

.signal-weak {
  color: #ef4444;
}

.data-timestamp {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 2rem;
}

.chart-wrapper {
  background-color: rgba(30, 41, 59, 0.7);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  height: 350px;
  display: flex;
  flex-direction: column;
}

.chart-wrapper h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #2563eb;
  text-align: center;
}

.location-chart {
  grid-column: span 2;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 250px;
  border-radius: 8px;
  overflow: hidden;
}

.gps-data p {
  margin-bottom: 1rem;
  text-align: center;
}

.no-gps-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #94a3b8;
}

canvas {
  width: 100% !important;
  height: calc(100% - 3rem) !important;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .chart-wrapper {
    height: 300px;
  }
  
  .location-chart {
    grid-column: span 1;
    height: 400px;
  }
}
</style>
