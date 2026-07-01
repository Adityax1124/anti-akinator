import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    
    base: '/',
    
    server: {
      port: 5173,
      host: true
    },
    
    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : true,
      minify: isProduction ? 'terser' : false,
      rollupOptions: {
        output: {
          // ===== SIMPLE manualChunks =====
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'axios']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true
    },
    
    resolve: {
      alias: {
        '@': '/src',
        '@context': '/src/context',
        '@api': '/src/api',
        '@pages': '/src/pages'
      }
    }
  };
});