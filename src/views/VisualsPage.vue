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
        <div class="status-item" :class="{ active: databaseConnected }">
          <span class="status-dot"></span>
          <span class="status-label">Database</span>
        </div>
        
        <div class="rssi-indicator">
          RSSI: <span :class="rssiClass">{{ lastRssi }} dBm</span>
        </div>
        
        <!-- Connection Button -->
        <div class="control-buttons">
          <button @click="connectToServer" class="connect-button" :disabled="isConnected">
            {{ isConnected ? 'Connected' : 'Connect to Server' }}
          </button>
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

// Server configuration
const availableServers = [
  'http://localhost:5173/api',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const serverUrl = ref(import.meta.env.VITE_API_URL || availableServers[0]);
console.log('Starting with API server URL:', serverUrl.value);

// State variables
const isConnected = ref(false);
const databaseConnected = ref(false);
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
  
  let date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // Try to parse string date if needed
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', timestamp);
    return '';
  }
  
  // Fix for database with future year timestamps
  if (date.getFullYear() > 2024) {
    // Replace 2025 with current year
    const currentYear = new Date().getFullYear();
    date.setFullYear(currentYear);
  }
  
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

// Normalize timestamp
function normalizeTimestamp(timestamp) {
  if (!timestamp) return Date.now();
  
  let date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // Try to parse string date if needed
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) {
    return Date.now();
  }
  
  // Fix for database with future year timestamps
  if (date.getFullYear() > 2024) {
    // Replace 2025 with current year
    const currentYear = new Date().getFullYear();
    date.setFullYear(currentYear);
  }
  
  return date.getTime();
}

// Connect to the specific working server
async function connectToServer() {
  try {
    console.log('Connecting to server:', availableServers[0]);
    
    // Use the first server in the list (localhost:5173/api)
    serverUrl.value = availableServers[0];
    
    // Clear any existing polling timers
    if (window.currentPollingTimer) {
      clearInterval(window.currentPollingTimer);
      delete window.currentPollingTimer;
    }
    
    // Try to connect
    const serverConnected = await testServerConnection();
    
    if (serverConnected) {
      // Fetch historical data
      await fetchHistoricalData();
      
      // Start polling
      startDataPolling();
      
      console.log('Successfully connected to', serverUrl.value);
    } else {
      console.error('Failed to connect to', serverUrl.value);
      alert(`Could not connect to ${serverUrl.value}. Please check that your backend server is running.`);
    }
  } catch (err) {
    console.error('Connection error:', err);
    alert(`Connection error: ${err.message}`);
  }
}

// Test connection to server
async function testServerConnection() {
  try {
    console.log(`Testing connection to server: ${serverUrl.value}`);
    const response = await axios.get(`${serverUrl.value}/data/latest`, {
      timeout: 3000,
      withCredentials: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
    console.log('Server connection test succeeded:', response.status);
    return true;
  } catch (err) {
    console.error('Server connection test failed:', err.message);
    return false;
  }
}

// Fetch historical data
async function fetchHistoricalData() {
  try {
    console.log(`Fetching historical data from: ${serverUrl.value}/data/history?limit=${MAX_DATA_POINTS}`);
    
    const response = await axios.get(`${serverUrl.value}/data/history?limit=${MAX_DATA_POINTS}`, {
      timeout: 5000,
      withCredentials: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('Historical data error:', error.message);
      throw error;
    });
    
    console.log('Received historical data:', response.data);
    
    databaseConnected.value = true;
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Clear any existing data first
      chartData.value.timestamps = [];
      chartData.value.temperature = [];
      chartData.value.humidity = [];
      chartData.value.pressure = [];
      chartData.value.altitude = [];
      chartData.value.acceleration.x = [];
      chartData.value.acceleration.y = [];
      chartData.value.acceleration.z = [];
      chartData.value.photo = [];
      chartData.value.rssi = [];
      
      // Process historical data in reverse order (oldest first)
      response.data.reverse().forEach(item => {
        parseData(item.data, item.rssi, item.timestamp);
      });
      
      console.log(`Loaded ${response.data.length} historical data points from database`);
      return true;
    } else {
      console.warn('No historical data received from server');
      return false;
    }
  } catch (err) {
    console.error('Failed to fetch historical data:', err.message);
    if (err.response) {
      console.error('Response error data:', err.response.data);
      console.error('Response error status:', err.response.status);
    }
    
    databaseConnected.value = false;
    
    // Try to reconnect after a delay
    setTimeout(() => {
      fetchHistoricalData();
    }, 5000);
    
    return false;
  }
}

// Start data polling (improved to poll at regular intervals and handle errors better)
function startDataPolling() {
  const pollingInterval = 2000; // 2 seconds
  let consecutiveErrors = 0;
  let lastProcessedDataId = null;
  
  const poll = async () => {
    try {
      console.log(`Polling data from: ${serverUrl.value}/data/latest`);
      
      const response = await axios.get(`${serverUrl.value}/data/latest`, {
        // Add a timeout to prevent hanging requests
        timeout: 5000,
        // Handle CORS issues
        withCredentials: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Received data response:', response.data);
      
      if (response.data) {
        isConnected.value = true;
        databaseConnected.value = true;
        consecutiveErrors = 0; // Reset error counter on success
        
        // Check for unique data point - some servers include an ID
        const dataId = response.data.id || response.data.timestamp;
        
        // Only process if we haven't processed this exact data point before
        if (dataId !== lastProcessedDataId) {
          console.log('New data detected, processing...');
          lastProcessedDataId = dataId;
          
          parseData(response.data.data, response.data.rssi, response.data.timestamp);
        } else {
          console.log('Skipping duplicate data point with ID:', dataId);
        }
      } else {
        console.warn('Received empty response from server');
      }
    } catch (err) {
      console.error('Failed to poll latest data:', err.message);
      if (err.response) {
        console.error('Response error data:', err.response.data);
        console.error('Response error status:', err.response.status);
      } else if (err.request) {
        console.error('No response received from server');
      }
      
      consecutiveErrors++;
      
      // After 3 consecutive errors, show disconnected state
      if (consecutiveErrors >= 3) {
        isConnected.value = false;
        databaseConnected.value = false;
      }
      
      // Increase polling interval if we keep getting errors (up to 10 seconds)
      if (consecutiveErrors > 5) {
        clearInterval(pollingTimer);
        setTimeout(() => {
          startDataPolling(); // Restart polling with default interval
        }, 10000);
        return;
      }
    }
  };
  
  // Run immediately and then set up interval
  poll();
  const pollingTimer = setInterval(poll, pollingInterval);
  
  // Store the timer in window object so we can clear it when switching modes
  window.currentPollingTimer = pollingTimer;
  
  // Clear interval on component unmount
  onUnmounted(() => {
    clearInterval(pollingTimer);
    delete window.currentPollingTimer;
  });
}

// Parse data from the server
function parseData(dataStr, rssi, timestamp = null) {
  try {
    console.log('Parsing data:', dataStr, 'RSSI:', rssi, 'Timestamp:', timestamp);
    
    // If data is empty or not a string, return false
    if (!dataStr || typeof dataStr !== 'string') {
      console.error('Invalid data string:', dataStr);
      return false;
    }
    
    const result = {};
    
    // Parse comma-separated values
    const pairs = dataStr.split(',');
    pairs.forEach(pair => {
      if (!pair || !pair.includes(':')) return;
      
      const [key, value] = pair.split(':');
      if (key && value !== undefined) {
        result[key.trim()] = value.trim();
      }
    });
    
    console.log('Parsed data object:', result);
    
    // If result is empty, return false
    if (Object.keys(result).length === 0) {
      console.error('No valid data pairs found in:', dataStr);
      return false;
    }
    
    // Set status flags
    dataStatus.value.launched = dataStr.includes('LAUNCHED');
    dataStatus.value.beeper = dataStr.includes('Beeper on');
    
    // Store RSSI
    lastRssi.value = rssi || 0;
    
    // Update timestamp - normalize to handle various formats
    lastTimestamp.value = normalizeTimestamp(timestamp);
    
    console.log('Using timestamp:', lastTimestamp.value, 'formatted as', formatTime(lastTimestamp.value));
    
    // Update chart data
    updateChartData(result, lastRssi.value, lastTimestamp.value);
    
    // Update GPS coordinates if valid
    if (result.Lat && result.Lng) {
      const lat = parseFloat(result.Lat);
      const lng = parseFloat(result.Lng);
      
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && result.Lat !== 'nan' && result.Lng !== 'nan') {
        lastLat.value = lat;
        lastLng.value = lng;
        
        // If we have a map, update the marker
        if (map && marker) {
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error parsing data:', err);
    return false;
  }
}

// Update chart data arrays
function updateChartData(data, rssi, timestamp) {
  console.log('Updating chart data with timestamp:', timestamp);
  
  const formattedTime = formatTime(timestamp);
  console.log('Formatted time for chart:', formattedTime);
  
  // Add new data
  chartData.value.timestamps.push(formattedTime);
  chartData.value.temperature.push(parseFloat(data.Temp) || 0);
  chartData.value.humidity.push(parseFloat(data.Humidity) || 0);
  chartData.value.pressure.push(parseFloat(data.Pressure) || 0);
  chartData.value.altitude.push(parseFloat(data.Altitude) || 0);
  chartData.value.acceleration.x.push(parseFloat(data.Gx) || 0);
  chartData.value.acceleration.y.push(parseFloat(data.Gy) || 0);
  chartData.value.acceleration.z.push(parseFloat(data.Gz) || 0);
  chartData.value.photo.push(parseFloat(data.Photo) || 0);
  chartData.value.rssi.push(rssi);
  
  console.log('Chart data point added. Total points:', chartData.value.timestamps.length);
  
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
    console.log('Removed oldest data point to stay within limit');
  }
  
  // Update all charts
  updateCharts();
}

// Update chart displays
function updateCharts() {
  console.log('Updating chart displays');
  
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
  
  console.log('All charts updated');
}

// Initialize all charts
function initializeCharts() {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500
    },
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
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

// Generate sample data for testing
function generateSampleData() {
  console.log('Generating sample data for testing');
  
  // Create a sample data string that matches the format from backend
  const sampleData = [
    { 
      data: "Time:1000,Temp:25.5,Humidity:65.2,Pressure:1013.5,Altitude:120.5,Lat:54.6872,Lng:25.2797,Gx:0.1,Gy:0.2,Gz:9.8,Photo:720",
      rssi: -65,
      timestamp: Date.now() - 50000
    },
    { 
      data: "Time:1001,Temp:25.7,Humidity:64.8,Pressure:1013.2,Altitude:121.0,Lat:54.6873,Lng:25.2798,Gx:0.15,Gy:0.18,Gz:9.78,Photo:730",
      rssi: -67,
      timestamp: Date.now() - 40000
    },
    { 
      data: "Time:1002,Temp:25.9,Humidity:64.5,Pressure:1013.0,Altitude:121.5,Lat:54.6874,Lng:25.2799,Gx:0.12,Gy:0.22,Gz:9.82,Photo:740",
      rssi: -68,
      timestamp: Date.now() - 30000
    },
    { 
      data: "Time:1003,Temp:26.1,Humidity:64.0,Pressure:1012.8,Altitude:122.0,Lat:54.6875,Lng:25.2800,Gx:0.08,Gy:0.25,Gz:9.81,Photo:750,LAUNCHED",
      rssi: -63,
      timestamp: Date.now() - 20000
    },
    { 
      data: "Time:1004,Temp:26.3,Humidity:63.5,Pressure:1012.5,Altitude:122.5,Lat:54.6876,Lng:25.2801,Gx:0.05,Gy:0.28,Gz:9.79,Photo:760,LAUNCHED,Beeper on",
      rssi: -62,
      timestamp: Date.now() - 10000
    }
  ];
  
  // Clear any existing data
  chartData.value.timestamps = [];
  chartData.value.temperature = [];
  chartData.value.humidity = [];
  chartData.value.pressure = [];
  chartData.value.altitude = [];
  chartData.value.acceleration.x = [];
  chartData.value.acceleration.y = [];
  chartData.value.acceleration.z = [];
  chartData.value.photo = [];
  chartData.value.rssi = [];
  
  // Add sample data points
  sampleData.forEach(item => {
    parseData(item.data, item.rssi, item.timestamp);
  });
  
  console.log('Sample data loaded:', sampleData.length, 'points');
  
  // Simulate new data coming in every 5 seconds
  let counter = 5;
  const sampleTimer = setInterval(() => {
    const now = Date.now();
    const newData = {
      data: `Time:${1000 + counter},Temp:${26.3 + Math.random()},Humidity:${63 - Math.random()},Pressure:${1012 - Math.random()},Altitude:${123 + counter},Lat:${54.6876 + counter/10000},Lng:${25.2801 + counter/10000},Gx:${Math.random()/10},Gy:${Math.random()/10},Gz:9.8,Photo:${760 + counter*10},LAUNCHED,Beeper on`,
      rssi: -60 - Math.floor(Math.random() * 10),
      timestamp: now
    };
    
    parseData(newData.data, newData.rssi, newData.timestamp);
    console.log('Generated new sample data point at:', formatTime(now));
    
    counter++;
    
    // Stop after 30 sample points
    if (counter > 30) {
      clearInterval(sampleTimer);
      console.log('Stopped generating sample data');
    }
  }, 5000);
  
  // Store the timer in a window variable so we can clear it if needed
  window.sampleDataTimer = sampleTimer;
}

// Lifecycle hooks
onMounted(async () => {
  console.log('VisualsPage component mounted');
  
  // Initialize charts first
  initializeCharts();
  console.log('Charts initialized');
  
  // Initialize map
  initializeMap();
  console.log('Map initialized');
  
  // Test server connection
  const serverConnected = await testServerConnection();
  if (!serverConnected) {
    console.warn('Could not connect to server on startup. Will keep retrying...');
    
    // Alert the user about connection issues
    alert(`Could not connect to server at ${serverUrl.value}. You can:\n1. Check if your server is running\n2. Click "Connect to Server" to try alternative URLs\n3. Click "Use Demo Data" to see simulated data`);
    
    // If we can't connect, use sample data for testing
    setTimeout(() => {
      generateSampleData();
    }, 2000);
  } else {
    // Fetch historical data
    const historyLoaded = await fetchHistoricalData();
    console.log('Historical data fetched:', historyLoaded ? 'success' : 'failed');
    
    // Start polling after a short delay to ensure backend is ready
    setTimeout(() => {
      startDataPolling();
      console.log('Data polling started');
    }, 1000);
  }
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
  
  // Clear any timers
  if (window.currentPollingTimer) {
    clearInterval(window.currentPollingTimer);
    delete window.currentPollingTimer;
  }
  
  if (window.sampleDataTimer) {
    clearInterval(window.sampleDataTimer);
    delete window.sampleDataTimer;
  }
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

.control-buttons {
  margin-left: auto;
}

.connect-button {
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: 'Orbitron', sans-serif;
  transition: background-color 0.2s;
}

.connect-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.connect-button:disabled {
  background-color: #10b981;
  cursor: default;
}

/* Remove debug button styles since they're no longer used */
.debug-controls {
  display: none;
}
</style>
