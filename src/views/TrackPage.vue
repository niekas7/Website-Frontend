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
      <button @click="flyToLithuania()" class="location-btn">Lietuva</button>
      <button @click="flyToRocket()" class="location-btn">Rocket</button>
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

// Add these variables to your existing refs
const cameraState = ref(null);
const restorePosition = ref(false);
const refreshInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
let refreshTimer = null;

// Add state to track the latest marker position
const latestMarkerPosition = ref(null);

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

// Function to fly to Kristupas marker
const flyToLithuania = () => {
  if (!viewer) return;
  
  const Cesium = window.Cesium;
  if (!Cesium) return;
  
  try {
    // Get Kristupas coordinates from localStorage
    let longitude = 23.93394;  // Default: near Kaunas
    let latitude = 54.88637;   // Default
    let height = 0;            // Default height
    
    const savedPosition = localStorage.getItem('kristupasMarkerPosition');
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        if (position && typeof position.longitude === 'number' && typeof position.latitude === 'number') {
          longitude = position.longitude;
          latitude = position.latitude;
          // Use height if available
          height = (typeof position.height === 'number') ? position.height : 0;
        }
      } catch (err) {
        console.error('Error parsing saved marker position:', err);
      }
    }
    
    console.log('Flying to view of Lithuania with Kristupas visible');
    
    // Set camera to center of Lithuania with marker still visible
    const lithuaniaCenterLongitude = 23.8813; // Approximate center of Lithuania
    const lithuaniaCenterLatitude = 55.1694;
    
    // Very high altitude to see most of Lithuania
    const destination = Cesium.Cartesian3.fromDegrees(lithuaniaCenterLongitude, lithuaniaCenterLatitude, 300000);
    
    // Simple top-down view without rotation
    const orientation = {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90), // Directly looking down
      roll: 0
    };
    
    // Fly to panoramic position
    viewer.camera.flyTo({
      destination: destination,
      orientation: orientation,
      duration: 3
    });
  } catch (flyErr) {
    console.error('Error flying to panoramic view:', flyErr);
  }
};

// Function to fly to the latest marker position
const flyToRocket = () => {
  if (!viewer) return;
  
  const Cesium = window.Cesium;
  if (!Cesium) return;
  
  try {
    // Check if we have a stored latest marker position
    if (latestMarkerPosition.value) {
      const { longitude, latitude, height = 0 } = latestMarkerPosition.value;
      
      // Calculate a position that's offset from the marker
      // Move camera south by 0.02 degrees and higher
      const cameraLongitude = longitude;
      const cameraLatitude = latitude - 0.01;
      const cameraHeight = height + 1200;
      
      // Create destination with offset
      const destination = Cesium.Cartesian3.fromDegrees(cameraLongitude, cameraLatitude, cameraHeight);
      
      // Fly to the position with adjusted orientation to look at the marker
      viewer.camera.flyTo({
        destination: destination,
        orientation: {
          heading: Cesium.Math.toRadians(0),  // Look north
          pitch: Cesium.Math.toRadians(-30),  // Look down at an angle
          roll: 0
        },
        duration: 3,
        complete: function() {
          // After flight completes, point the camera directly at the marker
          const markerPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
          viewer.camera.lookAt(
            markerPosition,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(0),
              Cesium.Math.toRadians(-30),
              1500  // Reduced distance from 2000 to 1500 meters
            )
          );
        }
      });
      
      console.log('Flying to rocket position with offset:', cameraLongitude, cameraLatitude, cameraHeight);
    } else {
      console.log('No rocket position available');
      // If no latest marker, fly to default KTU position as fallback
      const ktuLongitude = 23.93599878655166;
      const ktuLatitude = 54.92015109753495;
      
      // Add offset to KTU fallback as well
      const cameraLongitude = ktuLongitude;
      const cameraLatitude = ktuLatitude - 0.01;
      const cameraHeight = 1200;
      
      const destination = Cesium.Cartesian3.fromDegrees(cameraLongitude, cameraLatitude, cameraHeight);
      
      viewer.camera.flyTo({
        destination: destination,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-30),
          roll: 0
        },
        duration: 3,
        complete: function() {
          // Point at KTU after arrival
          const ktuPosition = Cesium.Cartesian3.fromDegrees(ktuLongitude, ktuLatitude, 0);
          viewer.camera.lookAt(
            ktuPosition,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(0),
              Cesium.Math.toRadians(-30),
              1500  // Reduced distance from 2000 to 1500 meters
            )
          );
        }
      });
    }
  } catch (error) {
    console.error('Error flying to rocket position:', error);
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

// Add this function to save camera state
const saveCameraState = () => {
  if (!viewer) return;
  
  const camera = viewer.camera;
  cameraState.value = {
    position: camera.position.clone(),
    heading: camera.heading,
    pitch: camera.pitch,
    roll: camera.roll,
    buildingTilesetVisible: buildingTileset?.show || false,
    osmBuildingTilesetVisible: osmBuildingTileset?.show || false
  };

  // Store in localStorage
  localStorage.setItem('cameraState', JSON.stringify({
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    heading: camera.heading,
    pitch: camera.pitch,
    roll: camera.roll,
    buildingTilesetVisible: buildingTileset?.show || false,
    osmBuildingTilesetVisible: osmBuildingTileset?.show || false,
    timestamp: Date.now()
  }));

  // Reload the page
  window.location.reload();
};

// Add this function to restore camera state
const restoreCameraState = () => {
  if (!viewer) return;
  
  try {
    const savedState = localStorage.getItem('cameraState');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    const timestamp = state.timestamp;

    // Only restore if saved within last 10 minutes
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      localStorage.removeItem('cameraState');
      return;
    }

    const position = new Cesium.Cartesian3(
      state.position.x,
      state.position.y,
      state.position.z
    );

    viewer.camera.setView({
      destination: position,
      orientation: {
        heading: state.heading,
        pitch: state.pitch,
        roll: state.roll
      }
    });

    // Restore tileset visibility
    if (buildingTileset) {
      buildingTileset.show = state.buildingTilesetVisible;
    }
    if (osmBuildingTileset) {
      osmBuildingTileset.show = state.osmBuildingTilesetVisible;
    }

    // Clear saved state
    localStorage.removeItem('cameraState');
  } catch (error) {
    console.error('Error restoring camera state:', error);
  }
};

// Simple function to remove all Kristupas markers
const removeAllKristupasMarkers = (viewer) => {
  if (!viewer || !viewer.entities) return;
  
  console.log('Removing all Kristupas-related entities');
  
  // Most direct method - completely remove all entities and re-add only non-Kristupas ones
  const entitiesToKeep = [];
  const entitiesToRemove = [];
  
  viewer.entities.values.forEach(entity => {
    // Check if this entity is related to Kristupas in any way
    if (entity && 
        ((entity.label && entity.label.text === 'Kristupas') || 
         (entity.billboard && entity.billboard.image && entity.billboard.image.getValue && 
          entity.billboard.image.getValue().includes && 
          entity.billboard.image.getValue().includes('Kristupas')) ||
         (entity.id && entity.id.includes && entity.id.includes('kristupas-height-box')))) {
      
      entitiesToRemove.push(entity);
    } else {
      // Only keep non-Kristupas entities
      entitiesToKeep.push(entity);
    }
  });
  
  // Remove all Kristupas entities first
  entitiesToRemove.forEach(entity => {
    try {
      viewer.entities.remove(entity);
    } catch (e) {
      console.error('Error removing entity:', e);
    }
  });
  
  console.log(`Removed ${entitiesToRemove.length} Kristupas-related entities`);
  
  // Nuclear option - if there are still Kristupas entities, remove all and re-add non-Kristupas
  let remaining = 0;
  viewer.entities.values.forEach(entity => {
    if (entity && 
        ((entity.label && entity.label.text === 'Kristupas') ||
         (entity.id && entity.id.includes && entity.id.includes('kristupas-height-box')))) {
      remaining++;
    }
  });
  
  if (remaining > 0) {
    console.log(`Still found ${remaining} Kristupas entities, using nuclear option`);
    
    // Save non-Kristupas entities
    const backupEntities = [];
    viewer.entities.values.forEach(entity => {
      if (entity && 
          !(entity.label && entity.label.text === 'Kristupas') && 
          !(entity.billboard && entity.billboard.image && 
            entity.billboard.image.getValue && 
            entity.billboard.image.getValue().includes && 
            entity.billboard.image.getValue().includes('Kristupas')) &&
          !(entity.id && entity.id.includes && entity.id.includes('kristupas-height-box'))) {
        
        // Create minimal backup of essential properties
        const backup = {
          position: entity.position
        };
        
        if (entity.point) {
          backup.point = {
            pixelSize: entity.point.pixelSize,
            color: entity.point.color
          };
        }
        
        if (entity.label) {
          backup.label = {
            text: entity.label.text,
            font: entity.label.font
          };
        }
        
        backupEntities.push(backup);
      }
    });
    
    // Remove all entities
    viewer.entities.removeAll();
    console.log('Removed ALL entities');
    
    // Re-add non-Kristupas entities
    backupEntities.forEach(data => {
      viewer.entities.add(data);
    });
    
    console.log(`Re-added ${backupEntities.length} non-Kristupas entities`);
  }
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
        }
      );

      // Style country polygons
      countryWallsDataSource.entities.values.forEach(entity => {
        if (entity.polygon) {
          entity.polygon.material = Cesium.Color.TRANSPARENT;
          entity.polygon.outline = true;
        }
      });

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
              console.log('Camera movement complete, adding markers');
              addKtuMarker(Cesium, viewer);
              
              // Add the Kristupas marker (the function handles removing any existing markers)
              addImageMarker(Cesium, viewer);
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

      // Start refresh timer
      refreshTimer = setInterval(saveCameraState, refreshInterval);

      // Restore camera position if available
      restoreCameraState();
      
      // Add event listener for storage changes to update marker position in real-time
      window.addEventListener('storage', (event) => {
        if (event.key === 'kristupasMarkerPosition' && viewer) {
          console.log('Storage event detected, updating marker position');
          // The addImageMarker function now handles removing old markers first
          addImageMarker(Cesium, viewer);
        }
      });
      
      // Add a custom event listener for more reliable updates (especially in the same window)
      window.addEventListener('kristupasMarkerUpdated', (event) => {
        console.log('Custom event detected, updating marker position');
        if (viewer) {
          // The addImageMarker function now handles removing old markers first
          addImageMarker(Cesium, viewer);
        }
      });
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
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
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

// Update the addImageMarker function to also store the latest position
const addImageMarker = (Cesium, viewer) => {
  try {
    if (!viewer || !viewer.entities) {
      console.error('Viewer not initialized');
      return;
    }
    
    // Make absolutely sure no Kristupas entities exist before adding new one
    removeAllKristupasMarkers(viewer);
    
    // Get coordinates from localStorage if available, otherwise use defaults
    let longitude = 23.93394;  // Default: near Kaunas
    let latitude = 54.88637;   // Default
    let height = 0;            // Default height in meters
    
    const savedPosition = localStorage.getItem('kristupasMarkerPosition');
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        if (position && typeof position.longitude === 'number' && typeof position.latitude === 'number') {
          longitude = position.longitude;
          latitude = position.latitude;
          // Use height if available, otherwise default to 0
          height = (typeof position.height === 'number' && !isNaN(position.height)) 
            ? position.height 
            : 0;
            
          // Store this as the latest marker position
          latestMarkerPosition.value = { longitude, latitude, height };
        }
      } catch (err) {
        console.error('Error parsing saved marker position:', err);
      }
    }
    
    if (typeof longitude === 'number' && typeof latitude === 'number' && 
        !isNaN(longitude) && !isNaN(latitude)) {
      
      // Create the Cartesian3 position with height
      const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
      
      if (position) {
        // Create a unique ID for this marker
        const entityId = 'kristupas-' + Date.now();
        
        // Add billboard entity with image
        const entity = viewer.entities.add({
          id: entityId,
          name: 'Kristupas Marker',
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
        
        // Add a box to visualize height from ground
        if (height > 0) {
          viewer.entities.add({
            id: 'kristupas-height-box-' + Date.now(),
            name: 'Kristupas Height Box',
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
            box: {
              dimensions: new Cesium.Cartesian3(5, 5, height),
              material: Cesium.Color.fromAlpha(Cesium.Color.BLUE, 0.5),
              outline: true,
              outlineColor: Cesium.Color.WHITE
            }
          });
        }
        
        console.log('Image marker added at:', longitude, latitude, 'with height:', height, 'ID:', entityId);
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