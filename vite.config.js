import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      // eslint-disable-next-line no-undef
      process.env.NODE_ENV || 'development'
    ), // Replacing with a string
    'process.env': {} // Prevents unwanted references
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    minify: true,
    lib: {
      entry: './src/component.js',
      name: 'MiniQRGenerator',
      fileName: () => `main.js`,
      formats: ['iife'] // Ensure it outputs in ES Module format
    },
    rollupOptions: {
      output: {
        // Ensure the module can be used as an external script
        inlineDynamicImports: true
      }
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      scopeBehaviour: 'local'
    }
  }
})
