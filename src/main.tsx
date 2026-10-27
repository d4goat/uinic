import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Font dibundel dari node_modules (tanpa CDN): CSP index.html hanya
// mengizinkan font asal-sama, dan perangkat sekolah sering luring.
import '@fontsource-variable/archivo/wght.css'
import '@fontsource-variable/inter/wght.css'
import 'lenis/dist/lenis.css'
import './styles/theme.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import SmoothScrollProvider from './components/SmoothScrollProvider'
import { pasangSinkronisasi } from './lib/offline'

// Kirim sesi yang tertunda begitu jaringan kembali (F6).
pasangSinkronisasi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SmoothScrollProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SmoothScrollProvider>
    </BrowserRouter>
  </StrictMode>,
)