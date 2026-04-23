import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'super-admin-login': resolve(__dirname, 'super-admin-login.html'),
        'super-admin-panel': resolve(__dirname, 'super-admin-panel.html'),
        'clg-admin': resolve(__dirname, 'src/pages/admin/clg-admin/clg-admin.html'),
      },
    },
  },
})
