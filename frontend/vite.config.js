import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Enable Fast Refresh in development only
        fastRefresh: true,
        // Use Babel for better compatibility
        babel: {
          plugins: [
            ['@babel/plugin-transform-runtime', { regenerator: true }]
          ]
        }
      }),
      // Bundle analyzer (only when needed - comment out if not)
      // visualizer({ open: true, filename: 'dist/stats.html' })
    ],
    
    base: '/',
    
    server: {
      port: 5173,
      host: true,
      strictPort: true, // Don't try other ports if 5173 is taken
      hmr: {
        overlay: true
      }
    },
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      
      // ===== SECURITY: Disable sourcemaps in production =====
      sourcemap: isProduction ? false : true,
      
      // ===== SECURITY: Minify with terser =====
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove console.log in production
          drop_console: isProduction,
          drop_debugger: isProduction,
          // Remove unused code
          unused: true,
          // Remove dead code
          dead_code: true,
          // Collapse variable declarations
          collapse_vars: true,
          // Reduce variable names
          reduce_vars: true
        },
        mangle: {
          // Mangle property names (makes code harder to read)
          properties: {
            regex: /^_/ // Only mangle properties starting with _
          }
        },
        format: {
          // Remove comments in production
          comments: isProduction ? false : true
        }
      },
      
      // ===== SECURITY: Split chunks =====
      rollupOptions: {
        output: {
          // Create separate chunks for better caching
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'ui-vendor': ['axios', 'react-hook-form'],
            // Other vendors
            'vendor': ['moment', 'react-hot-toast']
          },
          // Use content hash for cache busting
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          
          // ===== SECURITY: Sanitize filenames =====
          sanitizeFileName: (name) => {
            // Remove potentially dangerous characters
            return name.replace(/[^a-zA-Z0-9._-]/g, '');
          }
        }
      },
      
      // ===== PERFORMANCE: Optimize chunks =====
      chunkSizeWarningLimit: 1000,
      
      // ===== SECURITY: Empty outDir before build =====
      emptyOutDir: true,
      
      // ===== SECURITY: Content hash for assets =====
      manifest: false,
      
      // ===== SECURITY: Generate integrity hashes =====
      rollupOptions: {
        output: {
          // Add integrity hashes for subresource integrity (SRI)
          // This requires additional setup in your HTML
          // ...
        }
      }
    },
    
    // ===== SECURITY: Environment variables =====
    define: {
      // Only expose specific env variables to client
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      
      // ===== SECURITY: Remove sensitive env variables =====
      // Do NOT expose: VITE_DATABASE_URL, VITE_SECRET_KEY, etc.
    },
    
    // ===== SECURITY: CSS optimization =====
    css: {
      modules: {
        // Enable CSS modules for local scope
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        generateScopedName: isProduction 
          ? '[hash:base64:5]' 
          : '[name]__[local]__[hash:base64:5]'
      },
      preprocessorOptions: {
        scss: {
          // Suppress deprecation warnings in production
          quietDeps: isProduction
        }
      }
    },
    
    // ===== SECURITY: Resolve aliases =====
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
    
    // ===== SECURITY: Optimize dependencies =====
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios']
    },
    
    // ===== SECURITY: ESBuild options =====
    esbuild: {
      // Remove console.log in production
      drop: isProduction ? ['console', 'debugger'] : [],
      // Target modern browsers
      target: 'es2020',
      // Keep class names for better debugging (optional)
      keepNames: !isProduction
    }
  };
});