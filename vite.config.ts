import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) return 'charts';
            if (id.includes('node_modules/lucide-react')) return 'lucide-react';
            if (id.includes('node_modules/@supabase')) return 'supabase';
            if (id.includes('node_modules/motion')) return 'motion';
            if (id.includes('node_modules/xlsx') || id.includes('node_modules/sheetjs')) return 'xlsx';
            if (id.includes('node_modules/jspdf')) return 'jspdf';
            if (id.includes('node_modules/papaparse')) return 'papaparse';
            if (id.includes('src/services/gstAnalyticsService') || id.includes('src/services/profitabilityService')) {
              return 'analytics-engine';
            }
          },
        },
      },
    },
  };
});
