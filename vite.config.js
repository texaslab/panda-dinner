import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['panda.svg'],
      manifest: {
        name: 'Panda Dinner Generator',
        short_name: 'PandaDinner',
        description: 'Spin the wheel for tonight\'s dinner',
        theme_color: '#c8860a',
        background_color: '#fffef5',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'panda.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
});
