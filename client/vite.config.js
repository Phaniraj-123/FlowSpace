import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    process: { env: {} },
  },
  resolve: {
    alias: {
      events: 'eventemitter3',
    }
  }
})