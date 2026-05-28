import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // When shared/ imports axios, resolve it from frontend/node_modules
      // (needed in Docker where root node_modules is an isolated volume)
      axios: path.resolve(__dirname, 'node_modules/axios'),
    },
    dedupe: ['axios', 'react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
