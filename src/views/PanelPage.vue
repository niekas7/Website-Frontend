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
            <h2 class="section-title">Kristupas Marker Location</h2>
            
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

              <button @click="updateMarkerPosition" class="update-btn">Update Position</button>
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
const longitude = ref(23.93394);  // Default longitude
const latitude = ref(54.88637);   // Default latitude
const displayedLongitude = ref(longitude.value);
const displayedLatitude = ref(latitude.value);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};

const updateMarkerPosition = () => {
  // Store the new coordinates in localStorage
  localStorage.setItem('kristupasMarkerPosition', JSON.stringify({
    longitude: longitude.value,
    latitude: latitude.value,
    timestamp: Date.now() // Add timestamp to force update
  }));
  
  // Update displayed values
  displayedLongitude.value = longitude.value;
  displayedLatitude.value = latitude.value;
  
  // Dispatch a custom event that will be detected even in the same window
  window.dispatchEvent(new CustomEvent('kristupasMarkerUpdated', {
    detail: {
      longitude: longitude.value,
      latitude: latitude.value
    }
  }));
  
  console.log(`Marker position updated to: ${longitude.value}, ${latitude.value}`);
};

onMounted(() => {
  // Check if there are saved coordinates in localStorage
  const savedPosition = localStorage.getItem('kristupasMarkerPosition');
  if (savedPosition) {
    try {
      const position = JSON.parse(savedPosition);
      longitude.value = position.longitude;
      latitude.value = position.latitude;
      displayedLongitude.value = longitude.value;
      displayedLatitude.value = latitude.value;
    } catch (error) {
      console.error('Error parsing saved position:', error);
    }
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

.update-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-btn:hover {
  background-color: #1d4ed8;
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