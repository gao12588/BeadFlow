import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Set VITE_BASE_PATH=/repository-name/ in GitHub Actions. Local development stays at /.
export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, '.', '').VITE_BASE_PATH || '/',
  plugins: [react()],
  test: { environment: 'node' },
}))
