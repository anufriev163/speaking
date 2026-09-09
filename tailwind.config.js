/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        carbon: {
          900: '#0c0d0e',
          800: '#141618',
          700: '#1c1f23',
          600: '#282c33',
        },
        accent: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          emerald: '#10b981',
          purple: '#8b5cf6',
          rose: '#f43f5e'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'hud': '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(79, 172, 254, 0.2)',
        'glow-cyan': '0 0 25px rgba(0, 242, 254, 0.35)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.35)',
        'glow-rose': '0 0 25px rgba(244, 63, 94, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
