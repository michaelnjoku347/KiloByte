import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative base so the same dist/ works at a domain root, GitHub project pages, or a portfolio subpath.
  base: './',
})
