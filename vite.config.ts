import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/wongwian-tags-mobile/',
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
        theme_color: '#0e0e14',
        background_color: '#0e0e14',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
