import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const buildEnv = loadEnv(mode, process.cwd(), '');
  const firebaseReady = Boolean(buildEnv.VITE_FIREBASE_API_KEY && buildEnv.VITE_FIREBASE_AUTH_DOMAIN && buildEnv.VITE_FIREBASE_PROJECT_ID && buildEnv.VITE_FIREBASE_APP_ID);
  if (mode === 'production' && buildEnv.CI === 'true' && (buildEnv.VITE_TEST_MODE === 'true' || !firebaseReady)) {
    throw new Error('Production CI requires Firebase configuration and VITE_TEST_MODE disabled.');
  }

  return {
    plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Pay Wheel',
        short_name: 'Pay Wheel',
        description: 'Una ruota semplice per scegliere chi paga.',
        theme_color: '#111318',
        background_color: '#111318',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'it',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\./,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'font-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
        }]
      }
    })
    ]
  };
});
