<template>
  <div class="whole-page">
    <div class="app-container">
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

      <!-- Header -->
      <header class="header">
        <div class="header-inner">
          <div class="brand">
            <img src="/canfusion_logo.svg" alt="Logo" class="logo" />
            <span class="brand-name">CanFusion</span>
          </div>

          <nav class="desktop-nav">
            <!-- Navigation links -->
          </nav>

          <button class="menu-toggle" @click="toggleMenu">
            <svg v-if="!menuOpen" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Mobile menu -->
      <transition name="menu-transition">
        <div v-if="menuOpen" class="mobile-menu">
          <!-- Mobile navigation links -->
        </div>
      </transition>

      <!-- Main content -->
      <div class="content-wrapper">
        <section class="panel-content">
          <h1 class="panel-title">Control Panel</h1>
          
          <div class="control-section">
            <h2 class="section-title">Marker panel</h2>
            
            <div class="coordinates-control">
              <div class="coordinate-input">
                <label for="longitude">Longitude:</label>
                <input 
                  type="number" 
                  id="longitude" 
                  v-model="longitude" 
                  step="0.00001"
                  placeholder="Enter longitude"
                />
              </div>
              
              <div class="coordinate-input">
                <label for="latitude">Latitude:</label>
                <input 
                  type="number" 
                  id="latitude" 
                  v-model="latitude" 
                  step="0.00001"
                  placeholder="Enter latitude"
                />
              </div>
              
              <div class="coordinate-input">
                <label for="height">Height (meters):</label>
                <input 
                  type="number" 
                  id="height" 
                  v-model="height" 
                  step="10"
                  min="0"
                  max="10000"
                  placeholder="Enter height in meters"
                />
              </div>

              <div class="button-group">
                <button @click="updateMarkerPosition" class="update-btn">Update Position</button>
                <button @click="addNewMarker" class="add-btn">Add New Marker</button>
                <button @click="clearAllMarkers" class="clear-btn">Clear All Markers</button>
              </div>
            </div>
            
            <div class="current-position">
              <p>Current position: {{ displayedLongitude }}, {{ displayedLatitude }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const menuOpen = ref(false);
const longitude = ref(24);  // Default longitude
const latitude = ref(55);   // Default latitude
const height = ref(0);
const displayedLongitude = ref(longitude.value);
const displayedLatitude = ref(latitude.value);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};

const updateMarkerPosition = () => {
  // Find and update the latest marker in the allMarkers array
  let markers = [];
  const savedMarkers = localStorage.getItem('allMarkers');
  
  if (savedMarkers) {
    try {
      markers = JSON.parse(savedMarkers);
      
      if (markers.length > 0) {
        // Sort markers by timestamp if available, to find the latest one
        markers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // Update the latest marker's position
        markers[0].longitude = longitude.value;
        markers[0].latitude = latitude.value;
        markers[0].height = height.value;
        markers[0].timestamp = Date.now(); // Update timestamp
        
        // Save the updated markers back to localStorage
        localStorage.setItem('allMarkers', JSON.stringify(markers));
        
        // Also update kristupasMarkerPosition for backward compatibility only
        localStorage.setItem('kristupasMarkerPosition', JSON.stringify({
          longitude: longitude.value,
          latitude: latitude.value,
          height: height.value,
          timestamp: Date.now()
        }));
        
        console.log(`Updated latest marker (${markers[0].id}) position to:`, 
          longitude.value, latitude.value, height.value);
          
        // Update displayed values
        displayedLongitude.value = longitude.value;
        displayedLatitude.value = latitude.value;
        
        // Dispatch a custom event to notify TrackPage
        window.dispatchEvent(new CustomEvent('markerUpdated', {
          detail: {
            id: markers[0].id,
            longitude: longitude.value,
            latitude: latitude.value,
            height: height.value
          }
        }));
      } else {
        // No markers exist
        console.log('No markers exist to update. Please add a marker first.');
        alert('No markers exist. Please add a marker first.');
      }
    } catch (err) {
      console.error('Error updating marker position:', err);
    }
  } else {
    // No markers exist
    console.log('No markers exist to update. Please add a marker first.');
    alert('No markers exist. Please add a marker first.');
  }
};

const addNewMarker = () => {
  // Generate a unique ID for this marker
  const markerId = 'marker_' + Date.now();
  
  // Get current markers from localStorage
  let markers = [];
  const savedMarkers = localStorage.getItem('allMarkers');
  if (savedMarkers) {
    try {
      markers = JSON.parse(savedMarkers);
      if (!Array.isArray(markers)) {
        markers = [];
      }
    } catch (err) {
      console.error('Error parsing saved markers:', err);
      markers = [];
    }
  }
  
  // Create new marker object
  const newMarker = {
    id: markerId,
    longitude: longitude.value,
    latitude: latitude.value,
    height: height.value,
    timestamp: Date.now()
  };
  
  // Add new marker
  markers.push(newMarker);
  
  // Save updated list back to localStorage
  localStorage.setItem('allMarkers', JSON.stringify(markers));
  
  // Also update the kristupasMarkerPosition for backward compatibility only
  localStorage.setItem('kristupasMarkerPosition', JSON.stringify({
    longitude: longitude.value,
    latitude: latitude.value,
    height: height.value,
    timestamp: Date.now()
  }));
  
  // Update displayed values
  displayedLongitude.value = longitude.value;
  displayedLatitude.value = latitude.value;
  
  // Dispatch a custom event to notify TrackPage to add the marker
  window.dispatchEvent(new CustomEvent('markerAdded', {
    detail: {
      id: markerId,
      longitude: longitude.value,
      latitude: latitude.value,
      height: height.value
    }
  }));
  
  console.log(`New marker added at: ${longitude.value}, ${latitude.value}, ${height.value}`);
};

const clearAllMarkers = () => {
  // Clear ALL marker data from localStorage
  localStorage.removeItem('kristupasMarkerPosition');
  localStorage.removeItem('allMarkers');
  
  // Reset form values to defaults
  longitude.value = 24;
  latitude.value = 55;
  height.value = 0;
  
  // Update displayed values
  displayedLongitude.value = longitude.value;
  displayedLatitude.value = latitude.value;
  
  // Dispatch a custom event to notify TrackPage to clear ALL markers
  window.dispatchEvent(new CustomEvent('markersCleared', {
    detail: {
      clearAll: true,
      removeLatestPosition: true // Signal to clear latestMarkerPosition too
    }
  }));
  
  console.log('All markers cleared completely');
};

onMounted(() => {
  // Check if there are saved coordinates in localStorage
  const savedPosition = localStorage.getItem('kristupasMarkerPosition');
  if (savedPosition) {
    try {
      const position = JSON.parse(savedPosition);
      longitude.value = position.longitude;
      latitude.value = position.latitude;
      height.value = position.height || 0;
      displayedLongitude.value = longitude.value;
      displayedLatitude.value = latitude.value;
    } catch (error) {
      console.error('Error parsing saved position:', error);
      // Do not save default values to localStorage on error
    }
  } else {
    // Set default values for the form fields only, but don't save to localStorage
    displayedLongitude.value = longitude.value;
    displayedLatitude.value = latitude.value;
    console.log('No saved marker position, using default values for the form only.');
  }
});
</script>

<style>
/* Import Orbitron font */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
/* Import News Gothic font (or alternative if unavailable) */
@import url('https://fonts.googleapis.com/css2?family=News+Cycle:wght@400;700&display=swap');

/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.whole-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

.app-container {
  font-family: 'Orbitron', sans-serif;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.content-wrapper {
  width: 100%;
  position: relative;
  z-index: 1;
  overflow: visible;
}

/* Header styles */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  background-color: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo {
  height: 3.5rem;
  width: auto;
}

.brand-name {
  color: #2563eb;
  font-weight: 700;
  font-size: 2rem;
  font-family: 'Orbitron', sans-serif;
}

/* Navigation styles */
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
  font-family: 'Orbitron', sans-serif;
}

.nav-link:hover,
.nav-link:active,
.nav-link:focus {
  color: #2563eb;
  text-decoration: underline;
}

/* Mobile menu */
.menu-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: none;
  align-items: center;
  justify-content: center;
}

.menu-toggle svg {
  width: 2rem;
  height: 2rem;
  color: white;
}

.mobile-menu {
  position: fixed;
  top: 5rem;
  left: 0;
  width: 100%;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 9;
}

/* Panel content */
.panel-content {
  padding-top: 6rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panel-title {
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
}

/* Responsive styles */
@media (max-width: 767px) {
  .desktop-nav {
    display: none;
  }
  
  .menu-toggle {
    display: flex;
  }
}

/* Animations */
.menu-transition-enter-active {
  animation: slideDown 0.3s ease-out;
}

.menu-transition-leave-active {
  animation: slideUp 0.2s ease-in;
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-10px); opacity: 0; }
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

/* New styles for the coordinate control section */
.control-section {
  background-color: rgba(30, 41, 59, 0.8);
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.section-title {
  color: #2563eb;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.coordinates-control {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.coordinate-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.coordinate-input label {
  color: white;
  font-size: 1rem;
}

.coordinate-input input {
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #3b82f6;
  background-color: rgba(15, 23, 42, 0.7);
  color: white;
  font-family: 'Orbitron', sans-serif;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.update-btn, .clear-btn, .add-btn {
  margin-top: 0.5rem;
  padding: 0.75rem 1.5rem;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-btn {
  background-color: #2563eb;
  margin-top: 1rem;
}

.update-btn:hover {
  background-color: #1d4ed8;
}

.add-btn {
  background-color: #10b981;
}

.add-btn:hover {
  background-color: #059669;
}

.clear-btn {
  background-color: #dc2626;
}

.clear-btn:hover {
  background-color: #b91c1c;
}

.current-position {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.current-position p {
  color: white;
  font-size: 0.9rem;
  text-align: center;
}
</style>