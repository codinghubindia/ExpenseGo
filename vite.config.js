import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/ExpenseGo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Financial PWA',
        short_name: 'Financial',
        description: 'A Progressive Web App for managing personal finances',
        theme_color: '#2563EB',
        background_color: '#F1F5F9',
        display: 'standalone',
        scope: '/ExpenseGo/',
        start_url: '/ExpenseGo/',
        icons: [
          // ... your icons configuration
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sql\.js\.org\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sql-js-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  },
  optimizeDeps: {
    include: ['dayjs', '@mui/x-date-pickers']
  }
});