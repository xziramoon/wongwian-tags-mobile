import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// เลขรุ่นที่โชว์ในชื่อหน้า/หน้าแรก: วันที่-เวลา build (เวลาไทย) + รหัส commit — ดูว่าเครื่องได้รุ่นล่าสุดหรือยัง
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()
const stamp = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')
const APP_VERSION = `${stamp} · ${commit}`

// https://vite.dev/config/
export default defineConfig({
  base: '/wongwian-tags-mobile/',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // no custom runtimeCaching — Workbox's default precache only covers the
      // built JS/CSS/HTML/icons. It must NEVER intercept the Ably WebSocket
      // handshake (printBridge.ts) or the live CLOUD_DB_URL CSV fetch
      // (database.ts) — both have to hit the network fresh every time.
      manifest: {
        name: 'วงเวียน สแกนพิมพ์ป้าย',
        short_name: 'วงเวียนสแกน',
        description: 'สแกนบาร์โค้ดสินค้าแล้วส่งพิมพ์ป้ายราคาไปยังเครื่องพิมพ์ที่ร้าน',
        lang: 'th',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/wongwian-tags-mobile/',
        scope: '/wongwian-tags-mobile/',
        theme_color: '#0C0C0E',
        background_color: '#0C0C0E',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
