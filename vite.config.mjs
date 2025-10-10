import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'  // New import

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Add this—handles everything (no PostCSS needed)
  ],
  server: {
    port: 5173
  }
})


