import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        fastRefresh: true,
        babel: {
          plugins: [
            ['@babel/plugin-transform-runtime', { regenerator: true }]
          ]
        }
      })
    ],
    
    base: '/',
    
    server: {
      port: 5173,
      host: true,
      strictPort: true,
      hmr: {
        overlay: true
      }
    },
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProduction ? false : true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          unused: true,
          dead_code: true,
          collapse_vars: true,
          reduce_vars: true
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: isProduction ? false : true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['axios'],
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          sanitizeFileName: (name) => {
            return name.replace(/[^a-zA-Z0-9._-]/g, '');
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true,
      manifest: false
    },
    
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME),
    },
    
    css: {
      modules: {
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        generateScopedName: isProduction 
          ? '[hash:base64:5]' 
          : '[name]__[local]__[hash:base64:5]'
      },
      preprocessorOptions: {
        scss: {
          quietDeps: isProduction
        }
      }
    },
    
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@pages': '/src/pages',
        '@api': '/src/api',
        '@context': '/src/context',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
        '@assets': '/src/assets',
        '@styles': '/src/styles'
      }
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios']
    },
    
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      target: 'es2020',
      keepNames: !isProduction
    }
  };
});