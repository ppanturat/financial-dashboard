import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// create proxy to bypass browser cors for live yahoo data
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yf/, '')
      }
    }
  }
})
