import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tipolox/litgrid-react': resolve(__dirname, '../../packages/grid-react/src/DataGrid.tsx'),
      '@tipolox/litgrid-core': resolve(__dirname, '../../packages/grid-core/src/index.ts'),
      '@tipolox/litgrid-renderer': resolve(__dirname, '../../packages/grid-renderer/src/index.ts'),
      '@tipolox/litgrid-web': resolve(__dirname, '../../packages/grid-web/src/index.ts'),
      '@tipoloX/grid-react': resolve(__dirname, '../../packages/grid-react/src/DataGrid.tsx'),
      '@yourco/grid-core': resolve(__dirname, '../../packages/grid-core/src/index.ts'),
      '@yourco/grid-renderer': resolve(__dirname, '../../packages/grid-renderer/src/index.ts'),
      '@yourco/grid-web/src/DataGrid': resolve(__dirname, '../../packages/grid-web/src/DataGrid.ts')
    }
  }
})
