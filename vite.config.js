import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  preview: {
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@imgly') || id.includes('node_modules/onnxruntime')) {
            return 'imgly-engine';
          }
          if (id.includes('node_modules/@mediapipe')) {
            return 'mediapipe-engine';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal', '@mediapipe/tasks-vision'],
  },
});
