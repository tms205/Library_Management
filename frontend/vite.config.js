import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép các thiết bị khác trong cùng mạng Wi-Fi (như điện thoại) truy cập
  },
})
