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
      <button @click="toggleBorders" class="control-btn">
        {{ showWalls ? 'Slėpti sienas' : 'Rodyti sienas' }}
      </button>
      <button @click="toggleBuildings" class="control-btn">
        {{ showBuildings ? 'Išjungti pastatus' : 'Įjungti pastatus' }}
      </button>
      <button 
        @click="toggleBuildingType" 
        class="control-btn" 
        :class="{ 'disabled': !showBuildings }" 
        :disabled="!showBuildings"
      >
        {{ useGoogleTiles ? 'Paprasti pastatai' : 'Fotorealistiški pastatai' }}
      </button>
      <div class="slider-control" :class="{ 'disabled': !showBuildings }">
        <label for="renderDistance">3d pastatų atstumas:</label>
        <input 
          type="range" 
          id="renderDistance" 
          min="1000" 
          max="50000" 
          step="1000" 
          v-model="renderDistance" 
          @input="updateRenderDistance"
          :disabled="!showBuildings"
        />
        <span>{{ Math.round(renderDistance / 1000) }} km</span>
      </div>
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
let countryWallsDataSource = null;
const showWalls = ref(true);
const renderDistance = ref(1000); // Default 1km
const showBuildings = ref(false); // Buildings off by default
const useGoogleTiles = ref(false); // Use simple buildings (OSM) by default
let buildingTileset = null;
let osmBuildingTileset = null;

// Toggle country walls visibility
const toggleBorders = () => {
  if (!viewer || !viewer.entities || !countryWallsDataSource) return;
  
  showWalls.value = !showWalls.value;
  countryWallsDataSource.show = showWalls.value;
  
  // Also toggle any wall entities we added separately
  const entities = viewer.entities.values;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.name && entity.name.includes("Wall")) {
      entity.wall.show = showWalls.value;
    }
  }
};

// Toggle 3D buildings visibility
const toggleBuildings = () => {
  if (!viewer) return;
  
  showBuildings.value = !showBuildings.value;
  
  // Update visibility for the active tileset
  updateBuildingTilesets();
  
  if (showBuildings.value) {
    // Apply current render distance when re-enabling
    updateRenderDistance();
  }
};

// Toggle between Google 3D Tiles and OSM Buildings
const toggleBuildingType = () => {
  if (!viewer) return;
  
  useGoogleTiles.value = !useGoogleTiles.value;
  
  // Update visibility for tilesets
  updateBuildingTilesets();
  
  if (showBuildings.value) {
    // Update render distance for the newly active tileset
    updateRenderDistance();
  }
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

// Update 3D buildings rendering distance
const updateRenderDistance = () => {
  if (!viewer || !showBuildings.value) return;
  
  const activeTileset = useGoogleTiles.value ? buildingTileset : osmBuildingTileset;
  if (!activeTileset) return;
  
  try {
    const Cesium = window.Cesium;
    if (!Cesium) return;
    
    // Only set the maximum distance at which buildings are visible
    if (activeTileset.maximumScreenSpaceError) {
      // Fixed quality setting (not affected by slider)
      activeTileset.maximumScreenSpaceError = 16;
    }
    
    // Set a custom property for maximum viewing distance
    if (typeof activeTileset.customMaximumDistance === 'undefined') {
      // Store original parameters to allow toggling visibility
      activeTileset.customMaximumDistance = Number(renderDistance.value);
      
      // Add event listener to control visibility based on distance
      if (viewer.scene && viewer.scene.postRender) {
        viewer.scene.postRender.addEventListener((scene) => {
          if (!scene.camera || !showBuildings.value) return;
          
          try {
            // Get the active tileset
            const currentTileset = useGoogleTiles.value ? buildingTileset : osmBuildingTileset;
            if (!currentTileset || !currentTileset._root || !currentTileset._root.children) return;
            
            const cameraPosition = scene.camera.position;
            const distance = Number(renderDistance.value);
            
            // Set custom property based on distance from camera
            currentTileset.customMaximumDistance = distance;
            
            // Apply a simpler approach - hide/show the entire tileset based on camera height
            const cameraHeight = scene.globe.ellipsoid.cartesianToCartographic(cameraPosition).height;
            
            // Only update the active tileset's visibility
            if (useGoogleTiles.value && buildingTileset) {
              buildingTileset.show = showBuildings.value && useGoogleTiles.value && cameraHeight < distance * 1.5;
            } else if (!useGoogleTiles.value && osmBuildingTileset) {
              osmBuildingTileset.show = showBuildings.value && !useGoogleTiles.value && cameraHeight < distance * 1.5;
            }
          } catch (err) {
            console.warn('Error in post-render event:', err);
          }
        });
      }
    } else {
      // Update the custom maximum distance
      activeTileset.customMaximumDistance = Number(renderDistance.value);
    }
    
    console.log(`Building visibility distance set to: ${renderDistance.value} for ${useGoogleTiles.value ? 'Google' : 'OSM'} tileset`);
  } catch (err) {
    console.error('Error updating render distance:', err);
  }
};

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
      // Create a very simple viewer with error handling
      viewer = new Cesium.Viewer('cesiumContainer', {
        baseLayerPicker: true,
        geocoder: true,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: true,
        animation: false,  // Disable animation to prevent updating issues
        timeline: false,   // Disable timeline to prevent updating issues
        fullscreenButton: true,
        infoBox: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        scene3DOnly: true, // Force 3D only mode to avoid 2D projection issues
        shouldAnimate: false // Disable animation loop
      });
      
      if (!viewer || !viewer.scene) {
        throw new Error("Failed to initialize Cesium viewer");
      }
      
      // Add country walls
      try {
        // Create a GeoJSON data source for country walls
        countryWallsDataSource = new Cesium.GeoJsonDataSource('country-walls');
        
        // Load country walls from Natural Earth dataset
        await countryWallsDataSource.load(
          'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson', 
          {
            stroke: Cesium.Color.AQUA,
            fill: Cesium.Color.TRANSPARENT,
            strokeWidth: 3,
            markerSymbol: '',
            clampToGround: true
          }
        );

        // Convert border lines to extruded walls
        const entities = countryWallsDataSource.entities.values;
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          if (entity.polygon) {
            // Create wall effect with no fill
            entity.polygon.material = Cesium.Color.TRANSPARENT;
            entity.polygon.outline = true;
            entity.polygon.outlineColor = Cesium.Color.AQUA.withAlpha(1.0);
            entity.polygon.outlineWidth = 5;
            entity.polygon.extrudedHeight = 40; // Set wall height to 40
            
            // Add a wall entity using polylines instead of polygon fill
            if (entity.polygon.hierarchy && entity.name) {
              try {
                // Extract positions from polygon hierarchy
                const positions = entity.polygon.hierarchy.getValue().positions;
                if (positions && positions.length > 0) {
                  // Create a wall entity just on the boundary
                  viewer.entities.add({
                    name: entity.name + " Wall",
                    wall: {
                      positions: positions,
                      material: Cesium.Color.AQUA.withAlpha(0.7),
                      outline: true,
                      outlineColor: Cesium.Color.WHITE,
                      outlineWidth: 2,
                      minimumHeights: Array(positions.length).fill(0),
                      maximumHeights: Array(positions.length).fill(40) // Set wall height to 40
                    }
                  });
                }
              } catch (err) {
                console.warn("Failed to add wall for:", entity.name);
              }
            }
          }
        }
        
        // Add the data source to the viewer
        await viewer.dataSources.add(countryWallsDataSource);
        console.log('Country walls loaded successfully');
      } catch (wallsErr) {
        console.error('Error loading country walls:', wallsErr);
      }
      
      // Set default view to Lithuania with error handling
      try {
        const lithuaniaPosition = Cesium.Cartesian3.fromDegrees(23.8813, 55.1694, 500000);
        if (lithuaniaPosition) {
          viewer.camera.flyTo({
            destination: lithuaniaPosition,
            complete: () => {
              // Only add entities after camera has finished moving
              addKtuMarker(Cesium, viewer);
            }
          });
        }
      } catch (cameraErr) {
        console.error('Error setting camera position:', cameraErr);
      }
      
      // Enable terrain - using compatible API with error handling
      try {
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
      } catch (terrainErr) {
        console.error('Error setting terrain provider:', terrainErr);
      }
      
      // Add 3D buildings using compatible API with error handling
      try {
        // Try to load Google Photorealistic 3D Tiles
        try {
          // Google Photorealistic 3D Tiles (available through Cesium ion)
          buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
          
          if (buildingTileset && viewer.scene && viewer.scene.primitives) {
            viewer.scene.primitives.add(buildingTileset);
            console.log('Google Photorealistic 3D Tiles loaded successfully');
          }
        } catch (googleTilesErr) {
          console.warn('Error loading Google Photorealistic 3D Tiles:', googleTilesErr);
          // If Google tiles fail to load, default to OSM
          useGoogleTiles.value = false;
        }
        
        // Also load OSM Buildings for toggling between types
        try {
          if (Cesium.createOsmBuildingsAsync) {
            osmBuildingTileset = await Cesium.createOsmBuildingsAsync();
          } else if (Cesium.Cesium3DTileset) {
            osmBuildingTileset = new Cesium.Cesium3DTileset({
              url: Cesium.IonResource.fromAssetId(96188)
            });
          }
          
          if (osmBuildingTileset && viewer.scene && viewer.scene.primitives) {
            viewer.scene.primitives.add(osmBuildingTileset);
            console.log('OSM Buildings loaded successfully');
          }
        } catch (osmTilesErr) {
          console.warn('Error loading OSM Buildings:', osmTilesErr);
          // If OSM tiles fail to load and Google tiles already failed, no buildings will be available
          if (!buildingTileset) {
            console.error('Both building tilesets failed to load');
          }
        }
        
        // Set initial visibility based on settings
        updateBuildingTilesets();
        
        // Set initial render distance (only if buildings are shown)
        if (showBuildings.value) {
          updateRenderDistance();
        }
      } catch (buildingErr) {
        console.error('Error loading 3D buildings:', buildingErr);
      }
    } catch (viewerErr) {
      console.error('Error creating Cesium viewer:', viewerErr);
      error.value = viewerErr.toString();
      return;
    }
    
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
}

.control-btn:hover {
  background-color: #2563eb;
}

.control-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Slider control styling */
.slider-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-control.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.slider-control label {
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
}

.slider-control input[type="range"] {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: #1e293b;
  border-radius: 4px;
  outline: none;
}

.slider-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
}

.slider-control input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: none;
}

.slider-control span {
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  text-align: center;
}
</style> 