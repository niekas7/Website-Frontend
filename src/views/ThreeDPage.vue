<template>
  <div class="threed-container">
    <h1>3D Model Visualization</h1>
    <div class="model-container">
      <model-viewer
        src="/mockupas.glb"
        alt="3D model visualization"
        shadow-intensity="0.5"
        camera-controls
        interaction-prompt="none"
        camera-target="0m 0m 0m"
        camera-orbit="0deg 75deg 2.5m"
        min-field-of-view="30deg"
        max-field-of-view="60deg"
        field-of-view="45deg"
        interpolation-decay="0"
        disable-tap
        disable-zoom
        ar
        exposure="1.5"
        environment-intensity="1.2"
        environment-image="neutral"
        background-color="#0f172a"
        reveal="auto"
        preload
        dpr="2"
        image-sharpness="2"
        disable-hit-test
        shadow-softness="0"
        @error="handleError"
        @load="handleLoad"
        ref="modelViewer"
      >
        <div class="progress-container" slot="progress-bar">
          <div class="progress-bar">
            <div class="update-bar"></div>
          </div>
          <div class="loading-text">Loading model...</div>
        </div>
        <button slot="ar-button" class="ar-button">
          View in AR
        </button>
      </model-viewer>
      
      <button class="orbit-button" @click="toggleOrbit">
        {{ isOrbiting ? 'Stop Orbit' : 'Orbit Model' }}
      </button>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
        <button @click="tryAlternativeFormat" class="retry-button">Try Alternative Format</button>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
// Model-viewer is loaded via CDN in index.html

export default {
  name: 'ThreeDPage',
  setup() {
    const errorMessage = ref('');
    const currentFormat = ref('gltf');
    const modelViewer = ref(null);
    const isOrbiting = ref(false);
    let orbitAnimation = null;
    
    const handleError = (event) => {
      console.error('Error loading model', event);
      errorMessage.value = 'Error loading the 3D model. This might be due to format incompatibility.';
    };
    
    const handleLoad = () => {
      console.log('Model loaded successfully');
      errorMessage.value = '';
      
      // Hide the progress bar after loading
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
      
      // Apply high-quality rendering enhancements
      const modelViewerElement = document.querySelector('model-viewer');
      if (modelViewerElement) {
        // Force high quality rendering
        modelViewerElement.interpolationDecay = 0;
        
        // Access WebGL renderer through Three.js internals if available
        const renderer = modelViewerElement.renderer;
        if (renderer) {
          try {
            renderer.physicallyCorrectLights = true;
            renderer.outputColorSpace = 'srgb';
            renderer.maxAnisotropy = 16;
          } catch (e) {
            console.warn('Unable to set advanced renderer properties:', e);
          }
        }
        
        // Force high quality rendering in shadow DOM
        if (modelViewerElement.shadowRoot) {
          const canvas = modelViewerElement.shadowRoot.querySelector('canvas');
          if (canvas) {
            // Apply crisp rendering styles
            canvas.style.imageRendering = 'crisp-edges';
            
            // Disable image smoothing on the canvas if available
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = false;
            }
          }
          
          // Try to set shadow map settings if THREE is available
          try {
            modelViewerElement.shadowMap = {
              enabled: true,
              type: window.THREE?.PCFShadowMap || 'PCFShadowMap'
            };
          } catch (e) {
            console.warn('Unable to set shadow map properties:', e);
          }
        }
      }
    };
    
    const tryAlternativeFormat = () => {
      const modelViewerElement = document.querySelector('model-viewer');
      if (!modelViewerElement) return;
      
      if (currentFormat.value === 'gltf') {
        modelViewerElement.src = '/mockupas.glb';
        currentFormat.value = 'glb';
        errorMessage.value = 'Trying GLB format...';
      } else {
        modelViewerElement.src = '/mockupas.gltf';
        currentFormat.value = 'gltf';
        errorMessage.value = 'Trying GLTF format...';
      }
    };

    const toggleOrbit = () => {
      isOrbiting.value = !isOrbiting.value;
      
      if (isOrbiting.value) {
        startOrbit();
      } else {
        stopOrbit();
      }
    };

    const startOrbit = () => {
      if (!modelViewer.value) return;
      
      let theta = 0;
      const radius = 2.5; // Distance from model center
      const height = 75; // Camera height in degrees
      
      // Cancel any existing animation
      if (orbitAnimation) {
        cancelAnimationFrame(orbitAnimation);
      }
      
      const animate = () => {
        if (!isOrbiting.value) return;
        
        theta +=2; // Speed of rotation
        const orbitString = `${theta}deg ${height}deg ${radius}m`;
        modelViewer.value.setAttribute('camera-orbit', orbitString);
        
        orbitAnimation = requestAnimationFrame(animate);
      };
      
      orbitAnimation = requestAnimationFrame(animate);
    };
    
    const stopOrbit = () => {
      if (orbitAnimation) {
        cancelAnimationFrame(orbitAnimation);
        orbitAnimation = null;
      }
    };
    
    onMounted(() => {
      // Allow time for component to render before querying it
      setTimeout(() => {
        modelViewer.value = document.querySelector('model-viewer');
        
        if (modelViewer.value) {
          // Handle loading progress
          modelViewer.value.addEventListener('progress', (event) => {
            const updateBar = document.querySelector('.update-bar');
            if (updateBar) {
              updateBar.style.width = `${event.detail.totalProgress * 100}%`;
            }
          });
        } else {
          console.error('model-viewer element not found');
        }
      }, 100);
    });

    return {
      errorMessage,
      handleError,
      handleLoad,
      tryAlternativeFormat,
      modelViewer,
      toggleOrbit,
      isOrbiting
    };
  }
};
</script>

<style scoped>
.threed-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0f172a;
  color: white;
}

h1 {
  text-align: center;
  margin: 20px 0;
  font-family: 'Orbitron', sans-serif;
  color: white;
}

.model-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

model-viewer {
  width: 100%;
  height: 80vh;
  background-color: transparent;
  --poster-color: transparent;
  --progress-bar-height: 10px;
  --progress-mask: none;
  --progress-bar-color: #2563eb;
  --interaction-prompt-threshold: 300;
  --interaction-prompt: none;
  
  /* Add crisp rendering hints */
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}

/* Add performance optimizations */
model-viewer::part(default-progress-bar) {
  display: none;
}

model-viewer::part(camera-controls) {
  touch-action: pan-x pan-y;
}

model-viewer canvas {
  outline: none;
  contain: strict;
}

.progress-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  max-width: 300px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.update-bar {
  background-color: #2563eb;
  height: 100%;
  width: 0%;
  transition: width 0.2s;
}

.loading-text {
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  margin-top: 10px;
}

.ar-button {
  background-color: #2563eb;
  border-radius: 4px;
  border: none;
  color: white;
  position: absolute;
  bottom: 16px;
  right: 16px;
  padding: 12px 16px;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  cursor: pointer;
}

.ar-button:hover {
  background-color: #1d4ed8;
}

.orbit-button {
  background-color: #2563eb;
  border-radius: 4px;
  border: none;
  color: white;
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 12px 16px;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  cursor: pointer;
  z-index: 10;
}

.orbit-button:hover {
  background-color: #1d4ed8;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 80%;
  z-index: 10;
}

.retry-button {
  background-color: #2563eb;
  border-radius: 4px;
  border: none;
  color: white;
  padding: 10px 16px;
  margin-top: 15px;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  cursor: pointer;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.retry-button:hover {
  background-color: #1d4ed8;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  model-viewer {
    height: 70vh;
  }
}
</style> 