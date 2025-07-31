import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    // Ensure CSS is properly extracted
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Ensure CSS is in a single file
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // Ensure PostCSS is properly configured
  css: {
    postcss: './postcss.config.js'
  }
})