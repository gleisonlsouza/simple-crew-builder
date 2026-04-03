import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()] as any,
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/assets/**',
        '**/*.types.ts',
        'src/test/**',
        'vite.config.ts',
        'eslint.config.js'
      ]
    },
    deps: {
      optimizer: {
        web: {
          include: ['@testing-library/react', '@testing-library/dom']
        }
      }
    }
  }
})
