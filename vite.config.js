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
        name: 'ExpenseGo',
        short_name: 'ExpenseGo',
        description: 'A Progressive Web App for managing personal finances',
        theme_color: '#2563EB',
        background_color: '#F1F5F9',
        display: 'standalone',
        scope: '/ExpenseGo/',
        start_url: '/ExpenseGo/',
        icons: [
          {
            src: 'revenue-growth.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
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
        ],
        navigateFallback: 'offline.html'
      },
      devOptions: {
        enabled: process.env.NODE_ENV === 'development'
      }
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          charts: ['recharts', 'chart.js', 'react-chartjs-2']
        }
      }
    }
  },
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