/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Deployed under https://<user>.github.io/simon/ (ADR-8); also drives start_url and scope
const BASE = '/simon/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      // Never reload on update; a new version waits until all windows close (ADR-6)
      registerType: 'prompt',
      injectRegister: false,
      // Icons are already matched by globPatterns below
      includeManifestIcons: false,
      manifest: {
        // Must never change, or installs become a different app (ADR-9)
        id: `${BASE}app`,
        name: 'Simon',
        short_name: 'Simon',
        description: 'משחק זיכרון סיימון – חזרו על רצף הצבעים',
        lang: 'he',
        dir: 'rtl',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#1C1114',
        theme_color: '#1C1114',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 only: every supported browser picks it over the legacy woff files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
