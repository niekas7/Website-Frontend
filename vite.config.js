import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat <model-viewer> as a custom (non‑Vue) element
          isCustomElement: tag => tag === 'model-viewer',
        },
      },
    }),
  ],

  server: {
    /* --- Host / proxy settings --- */
    allowedHosts: ['canfusion.space', 'niekas7.hdun.org'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // NestJS backend
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ''),
        secure: false, // dev‑only
      },
    },

    /* --- Extra dev‑server hardening --- */
    watch: {
      ignored: ['**/.git/**'],         // Skip Git internals
    },
    fs: {
      strict: true,
      allow: ['.'],                    // Limit file access to project root
    },
  },

  /* --- Global replacements --- */
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
  },

  /* --- Path aliases --- */
  resolve: {
    alias: {
      cesium: path.resolve(
        __dirname,
        'node_modules/cesium/Build/Cesium',
      ),
    },
  },

  /* --- Build tweaks --- */
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
