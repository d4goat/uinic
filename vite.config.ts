import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // tailwindcss(): Tailwind v4 lewat plugin Vite — token desain ada di
  // src/styles/theme.css (@theme), tanpa tailwind.config.js terpisah.
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias "@/*" -> src/* (sama seperti tsconfig.app.json); komponen shadcn
    // di src/components/ui mengimpornya sebagai "@/lib/utils".
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Jangan pernah menanamkan berkas sebagai data: URI. CSP index.html hanya
    // mengizinkan font-src 'self'; font yang ditanam jadi data: akan ditolak
    // peramban dan memunculkan galat CSP di konsol tiap halaman dibuka.
    assetsInlineLimit: 0,
  },
})
