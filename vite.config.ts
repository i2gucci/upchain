import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using custom domain tradelog.fun (serves from root)
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
}))
