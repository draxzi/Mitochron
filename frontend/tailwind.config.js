/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { lab: '#F8FAFC', surface: '#FFFFFF', ink: '#0F172A', steel: '#475569', navy: '#1E3A8A', helix: '#0D9488', amber: '#D97706', line: '#E2E8F0', hover: '#F1F5F9' },
      fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'], journal: ['Newsreader', 'Georgia', 'serif'], mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
}
