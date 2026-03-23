import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}))
