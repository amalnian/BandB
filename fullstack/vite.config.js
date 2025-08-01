import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || '/BandB/tree/main/fullstack'
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
