import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 子路徑（TECH_SPEC §16）
export default defineConfig({
  base: '/pelagos/',
  plugins: [react()],
})
