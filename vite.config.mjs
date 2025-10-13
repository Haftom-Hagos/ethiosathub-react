import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Integrates Tailwind CSS seamlessly—no PostCSS config required
  ],
  base: '/',  // Ensures correct asset paths for production deploys (e.g., Render, GitHub Pages)
  server: {
    port: 5173,  // Custom dev server port
    mimeTypes: {
      'js': 'application/javascript',  // Explicit MIME for JS files (helps with deployment issues)
    },
  },
  build: {
    target: 'esnext',  // Modern browser support
    assetsDir: 'assets',  // Standard asset organization
    sourcemap: false,  // Disable in production for smaller bundles (enable for debugging)
  },
});