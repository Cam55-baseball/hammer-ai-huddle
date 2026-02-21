import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('tailwind-merge') || id.includes('clsx') || id.includes('cmdk') || id.includes('vaul') || id.includes('sonner')) {
              return 'vendor-ui';
            }
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('i18next') || id.includes('react-i18next') || id.includes('i18next-browser-languagedetector')) {
              return 'vendor-i18n';
            }
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('fabric')) return 'vendor-fabric';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
