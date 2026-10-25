import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Setiap halaman mengambil data saat mount lalu setState di dalam efek
      // (pola fetch-on-mount). Aturan ini menandai setState sinkron di badan
      // efek sebagai bahaya; di sini justru itu jalur yang benar karena sumber
      // datanya basis data, bukan state React.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Modul auth memang mengekspor Provider/hook/guard bersama komponen.
    // Fast refresh hanya relevan saat menyunting, bukan saat build.
    files: ['src/auth/**/*.tsx', 'src/lib/**/*.ts'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
