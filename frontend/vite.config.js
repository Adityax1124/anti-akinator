import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],

    base: '/',

    server: {
      port: 5173,
      host: true,

      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },

    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : true,
      minify: isProduction ? 'terser' : false,
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
    },

    define: {
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL),
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    }
  };
});