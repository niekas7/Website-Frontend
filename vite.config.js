import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    allowedHosts: ['canfusion.space']
  },
  // Define global Cesium variables
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  // Fix Cesium import resolution
  resolve: {
    alias: {
      'cesium': path.resolve(__dirname, 'node_modules/cesium/Build/Cesium')
    }
  },
  // Build configuration
  build: {
    chunkSizeWarningLimit: 4000
  }
})