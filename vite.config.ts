import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/mokutekichi/',
  plugins: [react(), tailwindcss()],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/mokutekichi/cesium/'),
  },
})
