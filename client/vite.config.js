import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 13000,
    proxy: {
      '/api': 'http://localhost:3004'
    }
  }
})
