import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Optional: Import model-viewer for global registration
// Note: This is now handled via the script tag in index.html
// import '@google/model-viewer'

// Set the Cesium base URL globally - this will be used by Cesium when it's imported
window.CESIUM_BASE_URL = '/cesium';

// Create the app and use the router
createApp(App)
  .use(router)
  .mount('#app')
