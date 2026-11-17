import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo_megafixa.png', 'logo_pwa.svg'],
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          globIgnores: ['**/logo_megafixa_badge.png', '**/logo_megafixa_circle.png'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,jpg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ]
        },
        manifest: {
          name: 'MEGAFIXAEDUC_PRO',
          short_name: 'MEGAFIXAEDUC_PRO',
          description: 'MEGAFIXAEDUC_PRO - Système complet de gestion scolaire moderne',
          theme_color: '#013efb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          id: '/',
          icons: [
            {
              src: '/logo_pwa.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/logo_pwa.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo_pwa.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo_pwa.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router-dom',
        '@vis.gl/react-google-maps',
        'lucide-react',
        'framer-motion',
        'react-hot-toast',
        'clsx',
        'tailwind-merge',
        'date-fns',
        'jspdf',
        'jspdf-autotable',
        'html-to-image',
        'html2canvas',
        'qrcode',
        'qrcode.react',
        'xlsx',
        'recharts'
      ],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('framer-motion') || id.includes('/motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image') || id.includes('jszip')) {
              return 'vendor-export';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
