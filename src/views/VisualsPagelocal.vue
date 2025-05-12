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
          <div class="chart-container" ref="tempChartRef"></div>
        </div>
        
        <div class="chart-wrapper">
          <h2>Humidity</h2>
          <div class="chart-container" ref="humidityChartRef"></div>
        </div>
        
        <div class="chart-wrapper">
          <h2>Pressure</h2>
          <div class="chart-container" ref="pressureChartRef"></div>
        </div>
        
        <div class="chart-wrapper">
          <h2>Altitude</h2>
          <div class="chart-container" ref="altitudeChartRef"></div>
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
          <div class="chart-container" ref="accelChartRef"></div>
        </div>
        
        <div class="chart-wrapper">
          <h2>Light Sensor</h2>
          <div class="chart-container" ref="photoChartRef"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import axios from 'axios';

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
const chartsInitialized = ref(false);
const inBatchProcessing = ref(false);
const lastRssi = ref(0);
const lastTimestamp = ref(null);
const lastLat = ref(0);
const lastLng = ref(0);
const dataStatus = ref({
  launched: false,
  beeper: false
});

// Google Charts variables
let googleChartsLoaded = false;
let temperatureChart = null;
let humidityChart = null;
let pressureChart = null;
let altitudeChart = null;
let accelerationChart = null;
let photoChart = null;
let map = null;
let marker = null;
let pollingInterval = null;

// Chart DOM references
const tempChartRef = ref(null);
const humidityChartRef = ref(null);
const pressureChartRef = ref(null);
const altitudeChartRef = ref(null);
const accelChartRef = ref(null);
const photoChartRef = ref(null);
const mapContainer = ref(null);

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
  rssi: []
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

// Load Google Charts
function loadGoogleCharts() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.charts) {
      console.log('Google Charts already loaded');
      googleChartsLoaded = true;
      resolve();
      return;
    }
    
    console.log('Loading Google Charts...');
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.onload = () => {
      console.log('Google Charts loader script loaded');
      
      // Load the charts package
      google.charts.load('current', { 'packages': ['corechart'] });
      google.charts.setOnLoadCallback(() => {
        console.log('Google Charts package loaded successfully');
        googleChartsLoaded = true;
        resolve();
      });
    };
    script.onerror = (error) => {
      console.error('Failed to load Google Charts:', error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

// Initialize all charts with Google Charts
async function initializeCharts() {
  console.log('Initializing charts...');
  
  if (!googleChartsLoaded) {
    console.log('Google Charts not loaded yet, loading now...');
    try {
      await loadGoogleCharts();
    } catch (error) {
      console.error('Failed to load Google Charts:', error);
      return false;
    }
  }
  
  // Check if DOM elements are ready
  if (!tempChartRef.value || !humidityChartRef.value || !pressureChartRef.value || 
      !altitudeChartRef.value || !accelChartRef.value || !photoChartRef.value) {
    console.error('Chart DOM elements not ready. Aborting chart initialization.');
    return false;
  }
  
  try {
    // Common chart options
    const commonOptions = {
      backgroundColor: 'transparent',
      curveType: 'none',
      legend: {
        position: 'top',
        textStyle: { color: 'white' }
      },
      chartArea: {
        width: '85%',
        height: '70%'
      },
      hAxis: {
        textStyle: { color: 'white' },
        gridlines: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      vAxis: {
        textStyle: { color: 'white' },
        gridlines: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      colors: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
    };
    
    // Create the data tables and charts
    
    // Temperature Chart
    const tempData = new google.visualization.DataTable();
    tempData.addColumn('string', 'Time');
    tempData.addColumn('number', 'Temperature (°C)');
    
    const tempRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.temperature[index]
    ]);
    tempData.addRows(tempRows);
    
    temperatureChart = new google.visualization.LineChart(tempChartRef.value);
    temperatureChart.draw(tempData, { ...commonOptions, title: '' });
    
    // Humidity Chart
    const humidityData = new google.visualization.DataTable();
    humidityData.addColumn('string', 'Time');
    humidityData.addColumn('number', 'Humidity (%)');
    
    const humidityRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.humidity[index]
    ]);
    humidityData.addRows(humidityRows);
    
    humidityChart = new google.visualization.LineChart(humidityChartRef.value);
    humidityChart.draw(humidityData, { ...commonOptions, title: '' });
    
    // Pressure Chart
    const pressureData = new google.visualization.DataTable();
    pressureData.addColumn('string', 'Time');
    pressureData.addColumn('number', 'Pressure (hPa)');
    
    const pressureRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.pressure[index]
    ]);
    pressureData.addRows(pressureRows);
    
    pressureChart = new google.visualization.LineChart(pressureChartRef.value);
    pressureChart.draw(pressureData, { ...commonOptions, title: '' });
    
    // Altitude Chart
    const altitudeData = new google.visualization.DataTable();
    altitudeData.addColumn('string', 'Time');
    altitudeData.addColumn('number', 'Altitude (m)');
    
    const altitudeRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.altitude[index]
    ]);
    altitudeData.addRows(altitudeRows);
    
    altitudeChart = new google.visualization.LineChart(altitudeChartRef.value);
    altitudeChart.draw(altitudeData, { ...commonOptions, title: '' });
    
    // Acceleration Chart
    const accelData = new google.visualization.DataTable();
    accelData.addColumn('string', 'Time');
    accelData.addColumn('number', 'X-Axis');
    accelData.addColumn('number', 'Y-Axis');
    accelData.addColumn('number', 'Z-Axis');
    
    const accelRows = chartData.value.timestamps.map((time, index) => [
      time, 
      chartData.value.acceleration.x[index],
      chartData.value.acceleration.y[index],
      chartData.value.acceleration.z[index]
    ]);
    accelData.addRows(accelRows);
    
    accelerationChart = new google.visualization.LineChart(accelChartRef.value);
    accelerationChart.draw(accelData, { ...commonOptions, title: '' });
    
    // Photo Chart
    const photoData = new google.visualization.DataTable();
    photoData.addColumn('string', 'Time');
    photoData.addColumn('number', 'Light Level');
    
    const photoRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.photo[index]
    ]);
    photoData.addRows(photoRows);
    
    photoChart = new google.visualization.LineChart(photoChartRef.value);
    photoChart.draw(photoData, { ...commonOptions, title: '' });
    
    console.log('All charts initialized successfully');
    chartsInitialized.value = true;
    return true;
  } catch (error) {
    console.error('Error initializing Google Charts:', error);
    return false;
  }
}

// Update chart displays with Google Charts
function updateCharts() {
  console.log('UpdateCharts - Starting update. Total data points:', chartData.value.timestamps.length);
  
  // Check if charts are initialized
  if (!chartsInitialized.value) {
    console.log('UpdateCharts - Charts not initialized yet, skipping update.');
    return;
  }
  
  // Check if Google Charts is loaded
  if (!googleChartsLoaded) {
    console.error('UpdateCharts - Google Charts not loaded yet! Aborting update.');
    return;
  }
  
  try {
    // Only update if we have data
    if (chartData.value.timestamps.length === 0) {
      console.log('UpdateCharts - No data to display.');
      return;
    }
    
    console.log('UpdateCharts - Updating chart instances with latest data...');
    
    // Update Temperature Chart
    const tempData = new google.visualization.DataTable();
    tempData.addColumn('string', 'Time');
    tempData.addColumn('number', 'Temperature (°C)');
    
    const tempRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.temperature[index]
    ]);
    tempData.addRows(tempRows);
    
    const commonOptions = {
      backgroundColor: 'transparent',
      curveType: 'none',
      legend: {
        position: 'top',
        textStyle: { color: 'white' }
      },
      chartArea: {
        width: '85%',
        height: '70%'
      },
      hAxis: {
        textStyle: { color: 'white' },
        gridlines: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      vAxis: {
        textStyle: { color: 'white' },
        gridlines: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      colors: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
    };
    
    temperatureChart.draw(tempData, { ...commonOptions, title: '' });
    
    // Update Humidity Chart
    const humidityData = new google.visualization.DataTable();
    humidityData.addColumn('string', 'Time');
    humidityData.addColumn('number', 'Humidity (%)');
    
    const humidityRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.humidity[index]
    ]);
    humidityData.addRows(humidityRows);
    
    humidityChart.draw(humidityData, { ...commonOptions, title: '' });
    
    // Update Pressure Chart
    const pressureData = new google.visualization.DataTable();
    pressureData.addColumn('string', 'Time');
    pressureData.addColumn('number', 'Pressure (hPa)');
    
    const pressureRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.pressure[index]
    ]);
    pressureData.addRows(pressureRows);
    
    pressureChart.draw(pressureData, { ...commonOptions, title: '' });
    
    // Update Altitude Chart
    const altitudeData = new google.visualization.DataTable();
    altitudeData.addColumn('string', 'Time');
    altitudeData.addColumn('number', 'Altitude (m)');
    
    const altitudeRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.altitude[index]
    ]);
    altitudeData.addRows(altitudeRows);
    
    altitudeChart.draw(altitudeData, { ...commonOptions, title: '' });
    
    // Update Acceleration Chart
    const accelData = new google.visualization.DataTable();
    accelData.addColumn('string', 'Time');
    accelData.addColumn('number', 'X-Axis');
    accelData.addColumn('number', 'Y-Axis');
    accelData.addColumn('number', 'Z-Axis');
    
    const accelRows = chartData.value.timestamps.map((time, index) => [
      time, 
      chartData.value.acceleration.x[index],
      chartData.value.acceleration.y[index],
      chartData.value.acceleration.z[index]
    ]);
    accelData.addRows(accelRows);
    
    accelerationChart.draw(accelData, { ...commonOptions, title: '' });
    
    // Update Photo Chart
    const photoData = new google.visualization.DataTable();
    photoData.addColumn('string', 'Time');
    photoData.addColumn('number', 'Light Level');
    
    const photoRows = chartData.value.timestamps.map((time, index) => [
      time, chartData.value.photo[index]
    ]);
    photoData.addRows(photoRows);
    
    photoChart.draw(photoData, { ...commonOptions, title: '' });
    
    console.log('UpdateCharts - All charts updated successfully.');
  } catch (error) {
    console.error('UpdateCharts - Error updating charts:', error);
  }
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

// Fetch historical data from database
async function fetchHistoricalData() {
  try {
    console.log('Fetching historical data...');
    const apiUrl = `${serverUrl.value}/data/history`;
    console.log('History API URL:', apiUrl);

    // Set batch processing flag to true
    inBatchProcessing.value = true;
    
    const response = await axios.get(apiUrl, { timeout: 10000 });
    
    console.log('Received historical data:', response.data);
    
    databaseConnected.value = true;
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      console.log(`Processing ${response.data.length} historical items...`);
      // Clear any existing data first
      chartData.value.timestamps = [];
      chartData.value.temperature = [];
      chartData.value.humidity = [];
      chartData.value.pressure = [];
      chartData.value.altitude = [];
      chartData.value.acceleration.x = [];
      chartData.value.acceleration.y = [];
      chartData.value.acceleration.z = [];
      chartData.value.rssi = [];
      chartData.value.photo = [];
      
      // Process historical data in reverse order (oldest first)
      response.data.reverse().forEach(item => {
        console.log('Processing historical item:', item);
        parseData(item.data, item.rssi, item.timestamp);
      });
      
      console.log('Finished processing historical data. Chart timestamps length:', chartData.value.timestamps.length);
      console.log(`Loaded ${response.data.length} historical data points from database`);
      
      // Ensure charts are initialized *before* the final update.
      console.log('FetchHistoricalData - Initializing charts now...');
      chartsInitialized.value = true;
      await initializeCharts();
      
      // Clear batch processing flag
      inBatchProcessing.value = false;
      
      // Now update the charts
      console.log('FetchHistoricalData - Updating charts with historical data...');
      updateCharts();
      console.log('FetchHistoricalData - Final chart update call finished.');
      
      return true;
    } else {
      console.warn('No historical data available.');
      inBatchProcessing.value = false;
      return false;
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    inBatchProcessing.value = false;
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
          
          // Initialize charts if this is the first data point and history failed/was empty
          if (!chartsInitialized.value) {
            console.log('StartDataPolling - Initializing charts now (first data point)...');
            chartsInitialized.value = true; // Set flag immediately
            initializeCharts();
            console.log('StartDataPolling - Charts initialized (attempted).'); // Changed log slightly
          }
           
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

// Parse data from the server
function parseData(dataStr, rssi, timestamp = null) {
  try {
    console.log('ParseData - Input:', { dataStr, rssi, timestamp });
    
    // If data is empty or not a string, return false
    if (!dataStr || typeof dataStr !== 'string') {
      console.error('ParseData - Error: Invalid data string', dataStr);
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
    
    console.log('ParseData - Parsed object:', result);
    
    // If result is empty, return false
    if (Object.keys(result).length === 0) {
      console.error('ParseData - Error: No valid data pairs found in:', dataStr);
      return false;
    }
    
    // Set status flags
    dataStatus.value.launched = dataStr.includes('LAUNCHED');
    dataStatus.value.beeper = dataStr.includes('Beeper on');
    
    // Store RSSI
    lastRssi.value = parseInt(rssi) || 0; // Ensure RSSI is a number
    console.log('ParseData - Updated RSSI:', lastRssi.value);
    
    // Update timestamp - normalize to handle various formats
    lastTimestamp.value = normalizeTimestamp(timestamp);
    console.log('ParseData - Normalized timestamp:', lastTimestamp.value, 'Formatted:', formatTime(lastTimestamp.value));
    
    // Update chart data arrays only
    const chartUpdateSuccess = updateChartData(result, lastRssi.value, lastTimestamp.value);
    if (!chartUpdateSuccess) {
      console.error('ParseData - Failed to update chart data.');
    } else {
      console.log('ParseData - Chart data arrays updated.');
      
      // Only call updateCharts when not in batch processing mode and charts are initialized
      if (!inBatchProcessing.value && chartsInitialized.value && googleChartsLoaded) {
        console.log('ParseData - Calling updateCharts with latest data.');
        updateCharts();
      }
    }
    
    // Update GPS coordinates if valid
    if (result.Lat && result.Lng) {
      const latStr = result.Lat;
      const lngStr = result.Lng;
      console.log('ParseData - Raw GPS coords:', { latStr, lngStr });
      
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      console.log('ParseData - Parsed GPS coords:', { lat, lng });

      const isValidLat = !isNaN(lat) && lat !== 0 && latStr !== 'nan';
      const isValidLng = !isNaN(lng) && lng !== 0 && lngStr !== 'nan';
      console.log('ParseData - GPS validation:', { isValidLat, isValidLng });

      if (isValidLat && isValidLng) {
        lastLat.value = lat;
        lastLng.value = lng;
        console.log('ParseData - Updated GPS state:', { lastLat: lastLat.value, lastLng: lastLng.value });
        
        // If we have a map, update the marker
        if (map && marker) {
          console.log('ParseData - Updating map marker and view...');
          try {
            // Update marker position
            marker.setLatLng([lat, lng]);
            
            // Use flyTo for smoother transition with lower animation duration
            map.flyTo([lat, lng], undefined, {
              duration: 0.5,
              easeLinearity: 0.5
            });
            
            // Ensure map is properly sized
            map.invalidateSize();
            
            console.log('ParseData - Map updated.');
          } catch (mapError) {
            console.error('ParseData - Error updating map:', mapError);
          }
        } else {
          console.warn('ParseData - Map or marker not ready for update.');
        }
      } else {
        console.warn('ParseData - Received invalid GPS coordinates.');
      }
    } else {
      console.log('ParseData - No GPS coordinates found in data.');
    }
    
    return true;
  } catch (err) {
    console.error('ParseData - General error:', err);
    return false;
  }
}

// Update chart data arrays
function updateChartData(data, rssi, timestamp) {
  try {
    console.log('UpdateChartData - Input:', { data, rssi, timestamp });
  
    const formattedTime = formatTime(timestamp);
    console.log('UpdateChartData - Formatted time for chart:', formattedTime);
    
    // Ensure data values are numbers, default to 0 if parsing fails
    const tempData = parseFloat(data.Temp);
    const humidityData = parseFloat(data.Humidity);
    const pressureData = parseFloat(data.Pressure);
    const altitudeData = parseFloat(data.Altitude);
    const accelXData = parseFloat(data.Gx);
    const accelYData = parseFloat(data.Gy);
    const accelZData = parseFloat(data.Gz);
    const photoData = parseFloat(data.Photo);
    const rssiData = parseFloat(rssi); // Ensure rssi is float

    console.log('UpdateChartData - Parsed numeric values:', { tempData, humidityData, pressureData, altitudeData, accelXData, accelYData, accelZData, photoData, rssiData });

    // Add new data
    chartData.value.timestamps.push(formattedTime);
    chartData.value.temperature.push(isNaN(tempData) ? 0 : tempData);
    chartData.value.humidity.push(isNaN(humidityData) ? 0 : humidityData);
    chartData.value.pressure.push(isNaN(pressureData) ? 0 : pressureData);
    chartData.value.altitude.push(isNaN(altitudeData) ? 0 : altitudeData);
    chartData.value.acceleration.x.push(isNaN(accelXData) ? 0 : accelXData);
    chartData.value.acceleration.y.push(isNaN(accelYData) ? 0 : accelYData);
    chartData.value.acceleration.z.push(isNaN(accelZData) ? 0 : accelZData);
    chartData.value.photo.push(isNaN(photoData) ? 0 : photoData);
    chartData.value.rssi.push(isNaN(rssiData) ? 0 : rssiData);
    
    console.log('UpdateChartData - Data point added. Total points:', chartData.value.timestamps.length);
    
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
      console.log('UpdateChartData - Removed oldest data point.');
    }
    
    return true; // Indicate success
  } catch (error) {
    console.error('UpdateChartData - Error:', error);
    return false; // Indicate failure
  }
}

// Initialize map for GPS visualization
function initializeMap() {
  console.log('InitializeMap - Starting...');
  // Check if Leaflet is available
  if (typeof L !== 'undefined') {
    console.log('InitializeMap - Leaflet library (L) found.');
    if (mapContainer.value) {
      console.log('InitializeMap - Map container element found.');
      // Prevent re-initialization if map already exists
      if (map) {
        console.log('InitializeMap - Map already initialized, skipping.');
        return;
      }
      
      try {
        console.log('InitializeMap - Creating Leaflet map instance...');
        // Set higher zoom level (9 instead of 7) and disable scroll wheel zoom to prevent accidental zooming
        map = L.map(mapContainer.value, {
          scrollWheelZoom: false,
          dragging: true,
          zoomControl: true
        }).setView([55.1694, 23.8813], 9);
        console.log('InitializeMap - Map instance created.');
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        console.log('InitializeMap - Tile layer added.');
        
        // Add initial marker
        marker = L.marker([55.1694, 23.8813]).addTo(map);
        console.log('InitializeMap - Initial marker added.');
        
        // Force resize the map to fit container
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
            console.log('InitializeMap - Map size refreshed.');
          }
        }, 300);
        
        console.log('InitializeMap - Map initialization complete.');
      } catch (mapInitError) {
        console.error('InitializeMap - Error creating map instance:', mapInitError);
      }
    } else {
      console.warn('InitializeMap - Map container element not found yet. Retrying in 100ms.');
      setTimeout(initializeMap, 100);
    }
  } else {
    console.warn('InitializeMap - Leaflet library (L) not found. Attempting to load dynamically...');
    // If Leaflet is not available, load it dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.onerror = () => console.error('InitializeMap - Failed to load Leaflet CSS.');
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      console.log('InitializeMap - Leaflet JS loaded dynamically.');
      // Initialize map after Leaflet is loaded
      setTimeout(() => {
        initializeMap();
      }, 100);
    };
    script.onerror = () => console.error('InitializeMap - Failed to load Leaflet JS.');
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
  
  // Wait for the DOM to be fully rendered
  await nextTick();
  
  try {
    // Load Google Charts first
    console.log('Loading Google Charts...');
    await loadGoogleCharts();
    
    console.log('Initializing map...');
    await initializeMap();
    console.log('Map initialized successfully');
    
    // Try to connect to server
    console.log('Testing server connection...');
    const serverConnected = await testServerConnection();
    console.log('Server connection test result:', serverConnected);
    
    // Fetch historical data first
    console.log('Fetching historical data...');
    const historySuccess = await fetchHistoricalData();
    console.log('Historical data fetch result:', historySuccess);
    
    // If data fetching failed, generate sample data
    if (!historySuccess && !serverConnected) {
      console.warn('Could not load historical data or connect to server, generating sample data...');
      generateSampleData();
    }
    
    // Start data polling
    console.log('Starting data polling...');
    startDataPolling();
    
    // Add resize event listener to update charts on window resize
    window.addEventListener('resize', () => {
      if (chartsInitialized.value && googleChartsLoaded) {
        console.log('Window resized, updating charts...');
        updateCharts();
      }
    });
    
    // Set up storage event listener for database changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'refreshVisualizationPages') {
        console.log('Database was cleared, reloading visualization page...');
        window.location.reload();
      }
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    alert('Error initializing the application. Please try refreshing the page.');
  }
});

onUnmounted(() => {
  console.log('VisualsPage component unmounting...');
  
  // Stop polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Data polling stopped');
  }
  
  // Remove event listeners
  window.removeEventListener('resize', () => updateCharts());
  
  // Google Charts instances don't need to be explicitly destroyed
  
  // Destroy map instance if it exists
  if (map) {
    map.remove();
    map = null;
  }
  
  console.log('Component cleanup complete');
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

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  flex-grow: 1;
  min-height: 250px;
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
  height: 220px;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 0;
  border: 1px solid rgba(100, 116, 139, 0.2);
  box-shadow: inset 0 0 8px rgba(15, 23, 42, 0.2);
}

.gps-data {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gps-data p {
  margin-bottom: 0.5rem;
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
  height: 100% !important;
  display: block; /* Ensure canvas is treated as a block element */
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
  
  .map-container {
    height: 180px;
  }
  
  .status-indicators {
    flex-direction: column;
    gap: 1rem;
  }
  
  .control-buttons {
    margin-top: 1rem;
    width: 100%;
  }
  
  .connect-button {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
}

.control-buttons {
  margin: 0 auto; /* Center instead of margin-left: auto */
  display: flex;
  justify-content: center;
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
  min-width: 160px; /* Give button a minimum width */
  text-align: center;
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
