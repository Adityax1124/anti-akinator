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
      // ===== REMOVE manualChunks COMPLETELY =====
      // Vercel/Rollup v4 handles this automatically
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