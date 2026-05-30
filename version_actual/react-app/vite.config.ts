import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // mobile-uix.css uses `@media (...), body.is-mobile` mixed selectors which
  // lightningcss (default Vite 8 CSS minifier) cannot parse. Disable CSS minification
  // for the preview build — bundle size is acceptable for Checkpoint A.
  build: {
    cssMinify: false,
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest: use our custom src/sw.ts so we can add push handlers.
      // Workbox precaching is still handled via precacheAndRoute(self.__WB_MANIFEST).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: '/',
        name: 'Mis Finanzas 2026',
        short_name: 'Finanzas',
        description: 'Control financiero personal y familiar — dual-currency USD/VES',
        lang: 'es',
        theme_color: '#0a0b0d',
        background_color: '#0a0b0d',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // OAuth en PWA instalada: al volver de Google (origen externo) Android
        // tiende a abrir el retorno en el navegador (se ve "tipo escritorio").
        // navigate-existing hace que el retorno reutilice la ventana de la PWA
        // ya abierta en vez de un contexto nuevo. Mitiga la limitación del SO.
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
