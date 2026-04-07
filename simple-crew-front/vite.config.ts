import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    process.env.VITE_COVERAGE === 'true' && istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'test/', 'e2e/'],
      extension: ['.ts', '.tsx'],
      requireEnv: true, // Only instrument when VITE_COVERAGE is true
    }),
  ].filter(Boolean),
  test: {
    globals: true,
    environment: 'jsdom',
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
