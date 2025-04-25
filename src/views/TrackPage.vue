<template>
  <div class="track-page">
    <div id="cesiumContainer" class="cesium-container"></div>
    <div class="track-nav">
      <router-link to="/" class="back-link">← Grįžti</router-link>
    </div>
    
    <!-- Add location selector -->
    <div class="location-selector">
      <button @click="flyToLocation('kaunas')" class="location-btn">Kaunas</button>
      <button @click="flyToLocation('moletai')" class="location-btn">Molėtai</button>
    </div>
    
    <!-- Controls panel -->
    <div class="controls-panel">
      <button @click="toggleBuildings" class="control-btn">
        {{ showBuildings ? 'Išjungti pastatus' : 'Įjungti pastatus' }}
      </button>
      <button 
        @click="toggleBuildingType" 
        class="control-btn" 
        :class="{ 'disabled': !showBuildings }"
      >
        {{ useGoogleTiles ? 'Paprasti pastatai' : 'Fotorealistiški pastatai' }}
      </button>
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
import * as Cesium from 'cesium';

// Track loading state and errors
const loadingComplete = ref(false);
const error = ref(null);
let viewer = null;
let countryWallsDataSource = null;
const showWalls = ref(true);
const showBuildings = ref(false); // Buildings off by default
const useGoogleTiles = ref(false); // Use simple buildings (OSM) by default
let buildingTileset = null;
let osmBuildingTileset = null;

// Toggle country walls visibility - optimized
const toggleBorders = () => {
  countryWallsDataSource.show = showWalls.value = !showWalls.value;
};

// Toggle 3D buildings with memory management
const toggleBuildings = () => {
  showBuildings.value = !showBuildings.value;
  updateBuildingTilesets();
};

// Toggle between Google 3D Tiles and OSM Buildings
const toggleBuildingType = () => {
  if (!viewer) return;
  useGoogleTiles.value = !useGoogleTiles.value;
  updateBuildingTilesets();
};

// Helper function to update tileset visibility
const updateBuildingTilesets = () => {
  if (buildingTileset) {
    buildingTileset.show = showBuildings.value && useGoogleTiles.value;
  }
  if (osmBuildingTileset) {
    osmBuildingTileset.show = showBuildings.value && !useGoogleTiles.value;
  }
};

// Function to fly to different locations with good Google 3D Tiles coverage
const flyToLocation = (location) => {
  if (!viewer) return;
  
  const Cesium = window.Cesium;
  if (!Cesium) return;
  
  try {
    let destination;
    let orientation = {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-25),
      roll: 0
    };
    
    switch(location) {
      case 'kaunas':
        destination = Cesium.Cartesian3.fromDegrees(23.9036, 54.8985, 500);
        break;
      case 'moletai':
        destination = Cesium.Cartesian3.fromDegrees(25.4177, 55.2344, 500);
        break;
      default:
        destination = Cesium.Cartesian3.fromDegrees(23.8813, 55.1694, 500000);
    }
    
    viewer.camera.flyTo({
      destination: destination,
      orientation: orientation,
      duration: 3
    });
  } catch (flyErr) {
    console.error('Error flying to location:', flyErr);
  }
};

// Optimized camera setup
const initializeCamera = (Cesium) => {
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 5000000;
  
  viewer.scene.globe.enableLighting = false;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.fog.enabled = false;
  viewer.scene.highDynamicRange = false;
};

// Helper function to set building style
const setBuildingStyle = (tileset) => {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["true", "color('white')"]
      ]
    }
  });
};

// Optimized viewer initialization
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
    
    try {
      // Create viewer with enhanced controls
      viewer = new Cesium.Viewer('cesiumContainer', {
        baseLayerPicker: false,      // Enable layer selection
        geocoder: true,             // Enable search bar
        homeButton: true,           // Enable home button
        sceneModePicker: true,      // Enable 2D/3D mode switch
        navigationHelpButton: true,  // Enable help button
        animation: false,
        timeline: false,
        fullscreenButton: true,
        infoBox: true,              // Enable entity info boxes
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        scene3DOnly: true,
        shouldAnimate: false,
        terrainShadows: Cesium.ShadowMode.DISABLED,
        shadows: false
      });

      initializeCamera(Cesium);
      
      // Load simplified country borders (110m instead of 50m)
      countryWallsDataSource = await Cesium.GeoJsonDataSource.load(
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
        {
          stroke: Cesium.Color.AQUA,
          strokeWidth: 2,
          clampToGround: true
        }
      );
      
      // Add the data source to the viewer
      await viewer.dataSources.add(countryWallsDataSource);
      console.log('Country walls loaded successfully');
      
      // Preload both tilesets
      buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207, {
        maximumScreenSpaceError: 32,
        show: false // Hidden initially
      });
      viewer.scene.primitives.add(buildingTileset);

      osmBuildingTileset = await Cesium.createOsmBuildingsAsync();
      osmBuildingTileset.maximumScreenSpaceError = 32;
      osmBuildingTileset.show = false; // Hidden initially  
      viewer.scene.primitives.add(osmBuildingTileset);

      // Set default view to Lithuania with error handling
      try {
        const lithuaniaPosition = Cesium.Cartesian3.fromDegrees(23.8813, 55.1694, 500000);
        if (lithuaniaPosition) {
          viewer.camera.flyTo({
            destination: lithuaniaPosition,
            complete: () => {
              // Only add entities after camera has finished moving
              addKtuMarker(Cesium, viewer);
              addImageMarker(Cesium, viewer); // Add custom image marker
            }
          });
        }
      } catch (cameraErr) {
        console.error('Error setting camera position:', cameraErr);
      }
      
      loadingComplete.value = true;

      if (buildingTileset) {
        setBuildingStyle(buildingTileset);
      }
    } catch (viewerErr) {
      console.error('Error creating Cesium viewer:', viewerErr);
      error.value = viewerErr.toString();
      return;
    }
  } catch (err) {
    console.error('Error initializing Cesium viewer:', err);
    error.value = err.toString();
  }
});

// Optimized entity cleanup
onUnmounted(() => {
  if (viewer) {
    viewer.entities.removeAll();
    viewer.scene.primitives.removeAll();
    viewer.destroy();
  }
});

// Add a helper function outside the main code to handle marker creation
const addKtuMarker = (Cesium, viewer) => {
  try {
    const ktuLongitude = 23.93599878655166;
    const ktuLatitude = 54.92015109753495;
    
    if (typeof ktuLongitude === 'number' && typeof ktuLatitude === 'number' && 
        !isNaN(ktuLongitude) && !isNaN(ktuLatitude)) {
      const position = Cesium.Cartesian3.fromDegrees(ktuLongitude, ktuLatitude);
      
      if (position && viewer.entities) {
        viewer.entities.add({
          position: position,
          point: {
            pixelSize: 10,
            color: Cesium.Color.BLUE
          },
          label: {
            text: 'KTU',
            font: '14pt sans-serif'
          }
        });
      }
    }
  } catch (markerErr) {
    console.error('Error adding KTU marker:', markerErr);
  }
};



// Add custom image marker at specific coordinates
const addImageMarker = (Cesium, viewer) => {
  try {
    // Hardcoded coordinates (replace with your desired location)
    const longitude = 23.95049;  // Example: near Kaunas
    const latitude = 54.92444;
    
    if (typeof longitude === 'number' && typeof latitude === 'number' && 
        !isNaN(longitude) && !isNaN(latitude)) {
      const position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
      
      if (position && viewer.entities) {
        // Add billboard entity with image
        viewer.entities.add({
          position: position,
          billboard: {
            image: '/Kristupas.png',
            width: 64,
            height: 64,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: 1.0
          },
          label: {
            text: 'Kristupas',
            font: '14pt sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -70),  // Offset label below image
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE
          }
        });
        
        console.log('Image marker added successfully');
      }
    }
  } catch (imageMarkerErr) {
    console.error('Error adding image marker:', imageMarkerErr);
  }
};
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
  will-change: transform;
  contain: strict;
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

.cesium-widget-credits {
  display: none !important;
}

/* Add location selector styling */
.location-selector {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  gap: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.location-btn {
  background-color: #1e293b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  will-change: transform;
  backface-visibility: hidden;
}

.location-btn:hover {
  background-color: #2563eb;
}

/* Controls panel styling */
.controls-panel {
  position: absolute;
  top: 52px;
  right: 10px;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-btn {
  background-color: #1e293b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  will-change: transform;
  backface-visibility: hidden;
}

.control-btn:hover {
  background-color: #2563eb;
}

.control-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>