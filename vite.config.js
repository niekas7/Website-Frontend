import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    allowedHosts: ['canfusion.space', 'niekas7.hdun.org'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your NestJS backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false // Only for local development
      }
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  resolve: {
    alias: {
      'cesium': path.resolve(__dirname, 'node_modules/cesium/Build/Cesium')
    }
  },
  build: {
    chunkSizeWarningLimit: 4000
  }
})