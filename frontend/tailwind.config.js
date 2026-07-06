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
          50:  '#fff3f0',
          100: '#ffe4de',
          200: '#ffcdc3',
          300: '#ffaa99',
          400: '#ff7a62',
          500: '#F43B1D', // --main-color
          600: '#e12a0d',
          700: '#bd220a',
          800: '#9c1f0e',
          900: '#811f12',
          950: '#470b04',
        },
        dark: {
          50:  '#f5f4f8',
          100: '#e7e6ec',
          200: '#c4c2d3',
          300: '#9c99b6',
          400: '#777298',
          500: '#555079',
          600: '#3b365d',
          700: '#282343',
          800: '#18152c', // --color-ten
          900: '#0f0c22',
          950: '#060315', // --color-three
        },
        accent: {
          gold: '#FF9F00',     // --color-eighteen
          mint: '#4CE9AD',     // --color-twentynine
          crimson: '#C11C36',  // --color-nine
          peach: '#FFEBDF',    // --color-seven
          fiery: '#FA401B',    // --color-four
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
