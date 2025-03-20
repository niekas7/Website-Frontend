<template>
  <div class="track-page">
    <div id="cesiumContainer" class="cesium-container"></div>
    <div class="track-nav">
      <router-link to="/" class="back-link">← Grįžti</router-link>
    </div>
    
    <!-- Add loading/error message -->
    <div v-if="!loadingComplete || error" class="cesium-error">
      <div class="error-box">
        <h2>Žemėlapio krovimas</h2>
        <p v-if="error">{{ error }}</p>
        <p v-else>Bandoma įkelti žemėlapį...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

// Track loading state and errors
const loadingComplete = ref(false);
const error = ref(null);
let viewer = null;

onMounted(async () => {
  try {
    // Check if Cesium is available globally
    if (!window.Cesium) {
      error.value = "Cesium not loaded. Try refreshing the page.";
      return;
    }
    
    // Use the global Cesium object
    const Cesium = window.Cesium;
    
    // Set Cesium Ion token from environment variables
    try {
      const cesiumToken = import.meta.env.VITE_CESIUM_TOKEN;
      if (cesiumToken) {
        Cesium.Ion.defaultAccessToken = cesiumToken;
        console.log('Cesium Ion token set successfully');
      } else {
        console.warn('No Cesium Ion token found in environment variables');
      }
    } catch (tokenErr) {
      console.warn('Error setting Cesium Ion token:', tokenErr);
    }
    
    // Create a very simple viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
      baseLayerPicker: true,
      geocoder: true,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: true,
      animation: true,
      timeline: true,
      fullscreenButton: true,
      infoBox: true,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity
    });
    
    // Set default view to Lithuania
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(23.8813, 55.1694, 500000)
    });
    
    // Enable terrain - using compatible API
    if (Cesium.createWorldTerrain) {
      viewer.terrainProvider = Cesium.createWorldTerrain();
    } else if (Cesium.WorldTerrainProvider) {
      viewer.terrainProvider = new Cesium.WorldTerrainProvider();
    } else if (Cesium.createWorldTerrainAsync) {
      viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
    } else if (Cesium.CesiumTerrainProvider) {
      // Fallback for older versions
      viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
        url: Cesium.IonResource.fromAssetId(1)
      });
    }
    
    // Add 3D buildings using compatible API
    try {
      let buildingTileset;
      if (Cesium.createOsmBuildingsAsync) {
        buildingTileset = await Cesium.createOsmBuildingsAsync();
      } else if (Cesium.Cesium3DTileset) {
        buildingTileset = new Cesium.Cesium3DTileset({
          url: Cesium.IonResource.fromAssetId(96188)
        });
      }
      
      if (buildingTileset) {
        viewer.scene.primitives.add(buildingTileset);
      }
    } catch (buildingErr) {
      console.error('Error loading 3D buildings:', buildingErr);
    }
    
    // Add a simple marker for KTU
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(23.93599878655166, 54.92015109753495),
      point: {
        pixelSize: 10,
        color: Cesium.Color.BLUE
      },
      label: {
        text: 'KTU',
        font: '14pt sans-serif'
      }
    });
    
    loadingComplete.value = true;
  } catch (err) {
    console.error('Error initializing Cesium viewer:', err);
    error.value = err.toString();
  }
});

onUnmounted(() => {
  // Clean up Cesium viewer when component is destroyed
  if (viewer) {
    try {
      viewer.destroy();
      viewer = null;
    } catch (e) {
      console.error('Error destroying viewer:', e);
    }
  }
});
</script>

<style>
/* Import required fonts */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

.track-page {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #0f172a;
  position: relative;
}

.cesium-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.track-nav {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.back-link {
  color: white;
  text-decoration: none;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.back-link:hover {
  color: #2563eb;
}

/* Add error message styling */
.cesium-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.7);
  z-index: 1000;
}

.error-box {
  background-color: rgba(30, 41, 59, 0.9);
  padding: 2rem;
  border-radius: 8px;
  max-width: 80%;
  color: white;
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.error-box h2 {
  margin-bottom: 1rem;
  color: #2563eb;
}

/* Main Cesium element dimensions */
.cesium-viewer {
  width: 100%;
  height: 100%;
}

/* For error diagnostics */
.cesium-widget-errorPanel {
  display: block !important;
}
</style> 