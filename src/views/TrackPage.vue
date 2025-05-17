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
      <button @click="flyToRocket()" class="location-btn">CanSat</button>
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
import axios from 'axios'; // Import axios for API calls

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

// Add state to track the latest marker position and all markers
const latestMarkerPosition = ref(null);
const allMarkers = ref([]);

// Add state to track if camera is locked facing a marker
const cameraLockedOnMarker = ref(false);

// Add polling state
let dataPollingTimer = null;
const pollingInterval = 2000; // 2 seconds
const lastProcessedDataId = ref(null);

// Server URL configuration
const availableServers = [
  'http://localhost:5173/api',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const serverUrl = ref(import.meta.env.VITE_API_URL || availableServers[0]);

// Define location-specific height offsets for known areas
const locationOffsets = {
  kaunas: {
    google: -100,
    osm: -80
  },
  moletai: {
    google: -200,
    osm: -150
  }
};

let currentLocation = ref('default');
const dynamicTerrainOffset = ref(-100); // Default dynamic offset

// Function to get appropriate height offset based on location or dynamic sampling
const getHeightOffsetForLocation = (isGoogle = true) => {
  if (locationOffsets[currentLocation.value]) {
    // Use pre-defined offset for known locations
    const offsets = locationOffsets[currentLocation.value];
    return isGoogle ? offsets.google : offsets.osm;
  } else {
    // For any location in the world, apply dynamic offset with some rules:
    // Google tiles need slightly deeper offset than OSM buildings
    return isGoogle ? dynamicTerrainOffset.value : dynamicTerrainOffset.value * 0.8;
  }
};

// Sample terrain at current location to determine appropriate building offsets
const sampleTerrainForOffset = async () => {
  if (!viewer || !viewer.scene || !viewer.scene.globe) return;

  try {
    console.log('Sampling terrain at current location to determine building height offsets');
    
    // Get current camera position
    const cameraPosition = viewer.camera.positionCartographic;
    const longitude = Cesium.Math.toDegrees(cameraPosition.longitude);
    const latitude = Cesium.Math.toDegrees(cameraPosition.latitude);
    
    // Define a grid of points around the camera to sample
    const sampleRadius = 0.01; // ~1km radius
    const samplePoints = [
      { lng: longitude, lat: latitude }, // Center
      { lng: longitude + sampleRadius, lat: latitude }, // East
      { lng: longitude - sampleRadius, lat: latitude }, // West
      { lng: longitude, lat: latitude + sampleRadius }, // North
      { lng: longitude, lat: latitude - sampleRadius }  // South
    ];
    
    // Convert to Cartographic for terrain sampling
    const positions = samplePoints.map(point => 
      Cesium.Cartographic.fromDegrees(point.lng, point.lat)
    );
    
    // Sample terrain heights
    const terrainProvider = viewer.scene.globe.terrainProvider;
    const updatedPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    
    if (updatedPositions && updatedPositions.length > 0) {
      // Calculate average height of sample points
      let totalHeight = 0;
      let validSamples = 0;
      
      updatedPositions.forEach(pos => {
        if (typeof pos.height === 'number' && !isNaN(pos.height)) {
          totalHeight += pos.height;
          validSamples++;
        }
      });
      
      if (validSamples > 0) {
        const averageHeight = totalHeight / validSamples;
        console.log('Average terrain height around current position:', averageHeight);
        
        // Determine base offset for buildings based on height:
        // Higher elevations generally need larger offsets
        const baseOffset = Math.min(-100, -80 - averageHeight * 0.1);
        
        // Update dynamic offset
        dynamicTerrainOffset.value = baseOffset;
        console.log('Set dynamic terrain offset to:', dynamicTerrainOffset.value);
        
        // Apply the new offset
        updateBuildingHeights();
        return true;
      }
    }
    
    console.log('Unable to determine terrain height, using default offset');
    return false;
  } catch (err) {
    console.error('Error sampling terrain for offset:', err);
    return false;
  }
};

// Function to update building heights based on location or dynamic sampling
const updateBuildingHeights = () => {
  if (!viewer) return;
  
  if (buildingTileset) {
    const googleOffset = getHeightOffsetForLocation(true);
    const transform = Cesium.Matrix4.fromTranslation(
      new Cesium.Cartesian3(0, 0, googleOffset)
    );
    buildingTileset.modelMatrix = transform;
  }
  
  if (osmBuildingTileset) {
    const osmOffset = getHeightOffsetForLocation(false);
    const transform = Cesium.Matrix4.fromTranslation(
      new Cesium.Cartesian3(0, 0, osmOffset)
    );
    osmBuildingTileset.modelMatrix = transform;
  }
  
  console.log(`Applied building height offsets: Google=${getHeightOffsetForLocation(true)}, OSM=${getHeightOffsetForLocation(false)}`);
};

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
  
  // Apply height adjustments (location-specific or dynamic)
  updateBuildingHeights();
  
  // Update visibility of both tilesets
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

// Modify flyToLocation to work for any location in the world
const flyToLocation = (location) => {
  if (!viewer) return;
  
  const Cesium = window.Cesium;
  if (!Cesium) return;
  
  try {
    // Reset camera lock state when flying to a location
    cameraLockedOnMarker.value = false;
    
    let destination;
    let orientation = {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-25),
      roll: 0
    };
    
    // Set known location or 'default' for global dynamic adjustment
    currentLocation.value = locationOffsets[location] ? location : 'default';
    
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
    
    // Clear any camera constraint before flying
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    
    viewer.camera.flyTo({
      destination: destination,
      orientation: orientation,
      duration: 3,
      complete: function() {
        // After flight completes, sample terrain height and adjust buildings
        if (currentLocation.value === 'default') {
          sampleTerrainForOffset();
        } else {
          // For known locations, use pre-defined offset
          updateBuildingHeights();
        }
      }
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
    // Reset camera lock state when flying to Lithuania
    cameraLockedOnMarker.value = false;
    
    // Get Kristupas coordinates from localStorage
    let longitude = 24;  // Default: near Kaunas
    let latitude = 55;   // Default
    let height = 0;      // Default height
    
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
    
    // Clear any camera constraint before flying
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    
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
      
      // Set camera lock state to true since we're focusing on the marker
      cameraLockedOnMarker.value = true;
      
      // Calculate a position that's offset from the marker
      // Move camera south by 0.01 degrees and higher
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
          if (cameraLockedOnMarker.value) { // Only if still locked
            const markerPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
            viewer.camera.lookAt(
              markerPosition,
              new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(0),
                Cesium.Math.toRadians(-30),
                1500  // Distance in meters from the target
              )
            );
          }
        }
      });
      
      console.log('Flying to rocket position with offset:', cameraLongitude, cameraLatitude, cameraHeight);
    } else {
      console.log('No marker position available for Rocket button');
      alert('No markers available. Please add a marker first.');
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
    },
    // Ensure buildings have correct height reference
    heightReference: "CLAMP_TO_GROUND"
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

// Simple function to remove all markers
const removeAllKristupasMarkers = (viewer) => {
  if (!viewer || !viewer.entities) return;
  
  console.log('Removing ALL marker entities');
  
  // Completely remove all entities except for the essential ones like KTU marker
  const entitiesToKeep = [];
  const entitiesToRemove = [];
  
  viewer.entities.values.forEach(entity => {
    // Check if this entity is a marker or related entity (more comprehensive check)
    if (entity && 
        // Any text label that's not explicitly "KTU"
        ((entity.label && entity.label.text && entity.label.text !== 'KTU') || 
         // Any entity with a billboard
         entity.billboard || 
         // Any entity with an ID containing marker-related terms
         (entity.id && entity.id.includes && 
          (entity.id.includes('marker') || 
           entity.id.includes('kristupas') || 
           entity.id.includes('height-box'))) ||
         // Any box entity (height indicators)
         entity.box)) {
      
      entitiesToRemove.push(entity);
    } else {
      // Only keep essential non-marker entities (like KTU marker)
      entitiesToKeep.push(entity);
    }
  });
  
  // Remove all marker entities
  entitiesToRemove.forEach(entity => {
    try {
      viewer.entities.remove(entity);
    } catch (e) {
      console.error('Error removing entity:', e);
    }
  });
  
  console.log(`Removed ${entitiesToRemove.length} marker-related entities`);
  
  // Nuclear option - if there are still entities that look like markers, use removeAll
  let remaining = 0;
  viewer.entities.values.forEach(entity => {
    if (entity && 
        ((entity.billboard) || 
         (entity.label && entity.label.text && entity.label.text !== 'KTU') ||
         entity.box)) {
      remaining++;
    }
  });
  
  if (remaining > 0) {
    console.log(`Still found ${remaining} potential marker entities, using nuclear option`);
    
    // Save essential non-marker entities
    const backupEntities = [];
    viewer.entities.values.forEach(entity => {
      // Only save the KTU marker and non-marker entities
      if (entity && 
          // Keep KTU marker
          ((entity.label && entity.label.text === 'KTU') ||
           // Keep essential non-marker entities
           (!(entity.billboard) && 
            !(entity.box) && 
            !(entity.id && entity.id.includes && 
              (entity.id.includes('marker') || 
               entity.id.includes('kristupas') || 
               entity.id.includes('height-box')))))) {
        
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
    
    // Re-add essential non-marker entities
    backupEntities.forEach(data => {
      viewer.entities.add(data);
    });
    
    console.log(`Re-added ${backupEntities.length} essential non-marker entities`);
  }
  
  // Clear the markers array
  allMarkers.value = [];
};

// Update the addImageMarker function to support multiple markers
const addImageMarker = (Cesium, viewer) => {
  try {
    if (!viewer || !viewer.entities) {
      console.error('Viewer not initialized');
      return;
    }
    
    // Make absolutely sure no Kristupas entities exist before adding new one
    removeAllKristupasMarkers(viewer);
    
    // Load all markers from the allMarkers collection only
    loadAllMarkers(Cesium, viewer);
    
    // The legacy kristupasMarkerPosition entry should only be used for backward compatibility
    // and to set latestMarkerPosition, not for adding an additional marker
    const savedPosition = localStorage.getItem('kristupasMarkerPosition');
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        if (position && typeof position.longitude === 'number' && typeof position.latitude === 'number') {
          // Just update the latestMarkerPosition reference (for Rocket button)
          // but don't add a marker - they're already added by loadAllMarkers
          latestMarkerPosition.value = { 
            longitude: position.longitude, 
            latitude: position.latitude, 
            height: (typeof position.height === 'number' && !isNaN(position.height)) ? position.height : 0
          };
          
          console.log('Updated latestMarkerPosition reference from kristupasMarkerPosition');
        }
      } catch (err) {
        console.error('Error parsing saved marker position:', err);
      }
    } else {
      console.log('No saved kristupasMarkerPosition found');
    }
  } catch (imageMarkerErr) {
    console.error('Error in addImageMarker:', imageMarkerErr);
  }
};

// Add a new function to load and display all markers
const loadAllMarkers = (Cesium, viewer) => {
  try {
    if (!viewer || !viewer.entities) return;
    
    // Get all markers from localStorage
    const savedMarkers = localStorage.getItem('allMarkers');
    if (!savedMarkers) {
      console.log('No allMarkers found in localStorage');
      return;
    }
    
    try {
      const markers = JSON.parse(savedMarkers);
      if (!Array.isArray(markers) || markers.length === 0) {
        console.log('No markers found in allMarkers array');
        return;
      }
      
      allMarkers.value = markers;
      console.log(`Loading ${markers.length} markers from allMarkers`);
      
      // Update the latestMarkerPosition with the most recent marker
      // Sort by timestamp to find the latest one
      const sortedMarkers = [...markers].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (sortedMarkers.length > 0) {
        const latest = sortedMarkers[0];
        latestMarkerPosition.value = {
          longitude: latest.longitude,
          latitude: latest.latitude, 
          height: latest.height || 0
        };
        console.log('Updated latestMarkerPosition from the most recent marker in allMarkers');
      }
      
      // Add each marker to the map
      markers.forEach((marker, index) => {
        const { id, longitude, latitude, height = 0, timestamp = 0 } = marker;
        
        if (typeof longitude === 'number' && typeof latitude === 'number' && 
            !isNaN(longitude) && !isNaN(latitude)) {
          
          // Create position
          const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
          
          // Create a unique ID based on the marker ID or timestamp
          const entityId = 'marker-' + (id || Date.now() + index);
          
          // Determine if this is the latest marker
          const isLatest = sortedMarkers.length > 0 && 
                          timestamp === sortedMarkers[0].timestamp;
          
          // Add entity
          viewer.entities.add({
            id: entityId,
            name: 'Custom Marker',
            position: position,
            billboard: {
              image: isLatest ? '/canfusion_logo.png' : '/marker.png',
              width: 32,
              height: 44,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              scale: 1.0,
              pixelFormat: Cesium.PixelFormat.RGBA,
              minimumPixelSize: 32,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          });
          
          // Add height box if height > 0
          if (height > 0) {
            viewer.entities.add({
              id: 'height-box-' + entityId,
              name: 'Height Box',
              position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
              box: {
                dimensions: new Cesium.Cartesian3(5, 5, height),
                material: Cesium.Color.fromAlpha(Cesium.Color.GREEN, 0.5),
                outline: true,
                outlineColor: Cesium.Color.WHITE
              }
            });
          }
          
          console.log(`Loaded marker ${entityId} at:`, longitude, latitude, height);
        }
      });
    } catch (err) {
      console.error('Error parsing saved markers:', err);
    }
  } catch (err) {
    console.error('Error loading all markers:', err);
  }
};

// Add a function to handle adding a single new marker
const addSingleMarker = (Cesium, viewer, markerData) => {
  try {
    if (!viewer || !viewer.entities) return;
    
    const { id, longitude, latitude, height = 0 } = markerData;
    
    if (typeof longitude === 'number' && typeof latitude === 'number' && 
        !isNaN(longitude) && !isNaN(latitude)) {
      
      // Create position
      const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
      
      // Create a unique ID
      const entityId = 'marker-' + (id || Date.now());
      
      // Update all existing markers to use marker.png since they are no longer the latest
      viewer.entities.values.forEach(entity => {
        if (entity.billboard && entity.billboard.image && 
            entity.billboard.image._value === '/canfusion_logo.png') {
          entity.billboard.image = '/marker.png';
        }
      });
      
      // Add entity - always use canfusion_logo for the newest marker
      viewer.entities.add({
        id: entityId,
        name: 'New Marker',
        position: position,
        billboard: {
          image: '/canfusion_logo.png',
          width: 32,
          height: 44,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 1.0,
          pixelFormat: Cesium.PixelFormat.RGBA,
          minimumPixelSize: 32,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      
      // Add height box if height > 0
      if (height > 0) {
        viewer.entities.add({
          id: 'height-box-' + entityId,
          name: 'Height Box',
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
          box: {
            dimensions: new Cesium.Cartesian3(5, 5, height),
            material: Cesium.Color.fromAlpha(Cesium.Color.GREEN, 0.5),
            outline: true,
            outlineColor: Cesium.Color.WHITE
          }
        });
      }
      
      console.log(`Added new marker ${entityId} at:`, longitude, latitude, height);
      
      // Store this as the latest marker position
      latestMarkerPosition.value = { longitude, latitude, height };
    }
  } catch (err) {
    console.error('Error adding single marker:', err);
  }
};

// Add a function to update a specific marker
const updateMarker = (Cesium, viewer, markerData) => {
  try {
    if (!viewer || !viewer.entities) return;
    
    const { id, longitude, latitude, height = 0 } = markerData;
    
    if (!id || typeof longitude !== 'number' || typeof latitude !== 'number' || 
        isNaN(longitude) || isNaN(latitude)) {
      console.error('Invalid marker data provided:', markerData);
      return;
    }
    
    // Find and remove the existing entity with this ID
    const entityId = 'marker-' + id;
    const heightBoxId = 'height-box-' + entityId;
    
    // Remove the existing marker and height box if they exist
    const existingEntity = viewer.entities.getById(entityId);
    if (existingEntity) {
      viewer.entities.remove(existingEntity);
    }
    
    const existingHeightBox = viewer.entities.getById(heightBoxId);
    if (existingHeightBox) {
      viewer.entities.remove(existingHeightBox);
    }
    
    // Update all existing markers to use marker.png since they are no longer the latest
    viewer.entities.values.forEach(entity => {
      if (entity.billboard && entity.billboard.image && 
          entity.billboard.image._value === '/canfusion_logo.png') {
        entity.billboard.image = '/marker.png';
      }
    });
    
    // Create position
    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
    
    // Add updated entity - always use canfusion_logo for the newly updated marker
    viewer.entities.add({
      id: entityId,
      name: 'Updated Marker',
      position: position,
      billboard: {
        image: '/canfusion_logo.png',
        width: 32,
        height: 44,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scale: 1.0,
        pixelFormat: Cesium.PixelFormat.RGBA,
        minimumPixelSize: 32,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    
    // Add height box if height > 0
    if (height > 0) {
      viewer.entities.add({
        id: heightBoxId,
        name: 'Height Box',
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
        box: {
          dimensions: new Cesium.Cartesian3(5, 5, height),
          material: Cesium.Color.fromAlpha(Cesium.Color.ORANGE, 0.5),
          outline: true,
          outlineColor: Cesium.Color.WHITE
        }
      });
    }
    
    console.log(`Updated marker ${entityId} at:`, longitude, latitude, height);
    
    // Store this as the latest marker position for the Rocket button
    latestMarkerPosition.value = { longitude, latitude, height };
    
  } catch (err) {
    console.error('Error updating marker:', err);
  }
};

// Add new function to poll data from the database
const startDataPolling = () => {
  console.log('Starting live data polling from:', serverUrl.value);
  
  if (dataPollingTimer) {
    clearInterval(dataPollingTimer);
  }
  
  let consecutiveErrors = 0;
  
  const poll = async () => {
    try {
      console.log(`Polling data from: ${serverUrl.value}/data/latest`);
      
      const response = await axios.get(`${serverUrl.value}/data/latest`, {
        timeout: 5000,
        withCredentials: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Received data response:', response.data);
      
      if (response.data) {
        consecutiveErrors = 0; // Reset error counter on success
        
        // Check for unique data point
        const dataId = response.data.id || response.data.timestamp;
        
        // Only process if we haven't processed this exact data point before
        if (dataId !== lastProcessedDataId.value) {
          console.log('New data detected, processing...');
          lastProcessedDataId.value = dataId;
          
          processLiveData(response.data);
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
      
      // If too many errors, extend polling interval
      if (consecutiveErrors > 5) {
        clearInterval(dataPollingTimer);
        setTimeout(() => {
          startDataPolling(); // Restart polling with default interval
        }, 10000);
        return;
      }
    }
  };
  
  // Run immediately and then set up interval
  poll();
  dataPollingTimer = setInterval(poll, pollingInterval);
};

// Add function to process live data
const processLiveData = (data) => {
  try {
    if (!data) return;
    
    // Parse the data format from the backend
    let latitude = null;
    let longitude = null;
    let height = 0; // Use height instead of altitude for consistency
    
    // Check if the data has the 'data' string property
    if (data.data && typeof data.data === 'string') {
      console.log('Parsing data string:', data.data);
      
      // Split by comma to get the key-value pairs
      const pairs = data.data.split(',');
      
      // Go through each pair to find lat, lng, and altitude
      pairs.forEach(pair => {
        if (!pair || !pair.includes(':')) return;
        const [key, value] = pair.split(':').map(s => s.trim());
        
        switch(key) {
          case 'Lat': 
            latitude = value === 'nan' ? null : parseFloat(value); 
            break;
          case 'Lng': 
            longitude = value === 'nan' ? null : parseFloat(value); 
            break;
          case 'Altitude': 
            height = parseFloat(value); 
            break;
        }
      });
      
      console.log('Extracted coordinates:', { latitude, longitude, height });
    } else if (data.lat !== undefined && data.lng !== undefined) {
      // Direct properties from database
      latitude = data.lat === 'nan' ? null : parseFloat(data.lat);
      longitude = data.lng === 'nan' ? null : parseFloat(data.lng);
      height = data.altitude !== undefined ? parseFloat(data.altitude) : 0;
    }
    
    if (typeof longitude === 'number' && typeof latitude === 'number' && 
        !isNaN(longitude) && !isNaN(latitude) && 
        longitude !== null && latitude !== null) {
        
      // Update the latest marker position
      latestMarkerPosition.value = {
        longitude,
        latitude,
        height: height || 0
      };
      
      // Generate a unique marker ID
      const markerId = 'livedata_' + Date.now();
      
      // Update or create marker
      const newMarker = {
        id: markerId,
        longitude,
        latitude,
        height: height || 0,
        timestamp: Date.now()
      };
      
      // Update markers list
      if (!allMarkers.value) allMarkers.value = [];
      
      // Remove previous live data markers to avoid cluttering
      allMarkers.value = allMarkers.value.filter(marker => !marker.id.includes('livedata_'));
      
      // Add new marker
      allMarkers.value.push(newMarker);
      
      // Update localStorage for other components
      localStorage.setItem('allMarkers', JSON.stringify(allMarkers.value));
      
      // Also update kristupasMarkerPosition for backward compatibility
      localStorage.setItem('kristupasMarkerPosition', JSON.stringify({
        longitude,
        latitude,
        height: height || 0,
        timestamp: Date.now()
      }));
      
      // Update the marker on the map if viewer exists
      if (viewer) {
        // Dispatch custom event to handle marker update
        window.dispatchEvent(new CustomEvent('markerUpdated', {
          detail: {
            id: markerId,
            longitude,
            latitude,
            height: height || 0
          }
        }));
      }
    }
  } catch (err) {
    console.error('Error processing live data:', err);
  }
};

// Add listener for camera changes to update building heights globally
const addCameraChangeListener = () => {
  if (!viewer) return;
  
  // Only sample terrain occasionally to avoid performance issues
  let lastSampleTime = 0;
  const SAMPLE_THROTTLE_MS = 5000; // Sample at most every 5 seconds
  
  viewer.camera.changed.addEventListener(() => {
    const now = Date.now();
    if (now - lastSampleTime > SAMPLE_THROTTLE_MS && currentLocation.value === 'default') {
      lastSampleTime = now;
      sampleTerrainForOffset();
    }
  });
};

// Modified onMounted function
onMounted(async () => {
  try {
    // Check if there are any markers in localStorage - if not, make sure to clear any that might be in memory
    if (!localStorage.getItem('allMarkers') && !localStorage.getItem('kristupasMarkerPosition')) {
      console.log('No markers found in localStorage, ensuring all markers are cleared');
      // Clear all markers from localStorage to ensure clean state
      localStorage.removeItem('kristupasMarkerPosition');
      localStorage.removeItem('allMarkers');
      // Will clear latestMarkerPosition after viewer is initialized
    }
    
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
      
      buildingTileset.clippingPlanes = new Cesium.ClippingPlaneCollection({
        enabled: false
      });
      
      // Apply initial height adjustment - will be updated dynamically
      const buildingTransform = Cesium.Matrix4.fromTranslation(
        new Cesium.Cartesian3(0, 0, getHeightOffsetForLocation(true))
      );
      buildingTileset.modelMatrix = buildingTransform;
            
      viewer.scene.primitives.add(buildingTileset);

      osmBuildingTileset = await Cesium.createOsmBuildingsAsync();
      osmBuildingTileset.maximumScreenSpaceError = 32;
      osmBuildingTileset.show = false; // Hidden initially
      
      const osmTransform = Cesium.Matrix4.fromTranslation(
        new Cesium.Cartesian3(0, 0, getHeightOffsetForLocation(false))
      );
      osmBuildingTileset.modelMatrix = osmTransform;
        
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
              
              // Check if there are saved markers before trying to add them
              if (localStorage.getItem('allMarkers') || localStorage.getItem('kristupasMarkerPosition')) {
                // Add the Kristupas marker (the function handles removing any existing markers)
                addImageMarker(Cesium, viewer);
              } else {
                console.log('No saved markers found during initialization, not adding any markers');
              }
            }
          });
        }
      } catch (cameraErr) {
        console.error('Error setting camera position:', cameraErr);
      }
      
      // After the loadingComplete and before event listeners
      loadingComplete.value = true;

      if (buildingTileset) {
        setBuildingStyle(buildingTileset);
      }

      // Start refresh timer
      refreshTimer = setInterval(saveCameraState, refreshInterval);

      // Restore camera position if available
      restoreCameraState();
      
      // Make sure latestMarkerPosition is cleared if there are no markers
      if (!localStorage.getItem('allMarkers') && !localStorage.getItem('kristupasMarkerPosition')) {
        latestMarkerPosition.value = null;
      }
      
      // Add event listener for storage changes to update marker position in real-time
      window.addEventListener('storage', (event) => {
        if (event.key === 'kristupasMarkerPosition' && viewer) {
          console.log('Storage event detected, updating marker position');
          // The addImageMarker function now handles removing old markers first
          addImageMarker(Cesium, viewer);
        } else if (event.key === 'allMarkers' && viewer) {
          console.log('Storage event detected, updating all markers');
          removeAllKristupasMarkers(viewer);
          loadAllMarkers(Cesium, viewer);
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
      
      // Add a listener for the markersCleared event
      window.addEventListener('markersCleared', (event) => {
        console.log('markersCleared event detected, removing all markers');
        if (viewer) {
          removeAllKristupasMarkers(viewer);
          
          // Clear the latest marker position if requested
          if (event.detail && event.detail.removeLatestPosition) {
            latestMarkerPosition.value = null;
            console.log('Latest marker position reference cleared');
          }
        }
      });
      
      // Add a listener for the markerAdded event
      window.addEventListener('markerAdded', (event) => {
        console.log('markerAdded event detected, adding new marker');
        if (viewer && event.detail) {
          addSingleMarker(Cesium, viewer, event.detail);
        }
      });

      // Add a listener for the markerUpdated event
      window.addEventListener('markerUpdated', (event) => {
        console.log('markerUpdated event detected, updating specific marker');
        if (viewer && event.detail) {
          updateMarker(Cesium, viewer, event.detail);
        }
      });

      // Start polling for live data
      startDataPolling();
      
      // Add listener for camera changes to update building heights globally
      addCameraChangeListener();
      
      // Sample terrain at current position for initial offset
      setTimeout(() => {
        sampleTerrainForOffset();
      }, 1000);
      
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
  if (dataPollingTimer) {
    clearInterval(dataPollingTimer);
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
    const ktuHeight = 200; // Add height to place marker above buildings
    
    if (typeof ktuLongitude === 'number' && typeof ktuLatitude === 'number' && 
        !isNaN(ktuLongitude) && !isNaN(ktuLatitude)) {
      const position = Cesium.Cartesian3.fromDegrees(ktuLongitude, ktuLatitude, ktuHeight);
      
      if (position && viewer.entities) {
        viewer.entities.add({
          position: position,
          point: {
            pixelSize: 10,
            color: Cesium.Color.BLUE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY // Always show regardless of buildings
          },
          label: {
            text: 'KTU',
            font: '14pt sans-serif',
            disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always show regardless of buildings
            pixelOffset: new Cesium.Cartesian2(0, -20), // Offset label to appear above point
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE
          },
          billboard: {
            image: '/marker.png', // Use a marker image for better visibility
            width: 32,
            height: 44,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY // Always show regardless of buildings
          }
        });
      }
    }
  } catch (markerErr) {
    console.error('Error adding KTU marker:', markerErr);
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