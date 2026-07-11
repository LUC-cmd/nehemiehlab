/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef8fa',
          100: '#d5eef2',
          200: '#aedce5',
          300: '#7bc4d1',
          400: '#3f9fb3',
          500: '#004b57', // brand teal — boutons / validation
          600: '#003840',
          700: '#002f36',
          800: '#00262c',
          900: '#001c21',
          950: '#001116',
        },
        brand: {
          teal: '#004b57',
          tealDeep: '#003840',
          tealLight: '#006878',
          orange: '#F43B1D',
          page: '#ffffff',
          pageSoft: '#f4f7f8',
        },
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          gold: '#FF9F00',
          mint: '#4CE9AD',
          crimson: '#C11C36',
          peach: '#FFEBDF',
          fiery: '#FA401B',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
        'slide-in-left': 'slideInLeft 0.5s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'hero-pattern': "url('/assets/img/hero-bg.jpg')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
