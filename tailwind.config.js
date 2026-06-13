/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        display: ['"Shippori Mincho"', 'serif'],
      },
      colors: {
        ink: {
          50: '#f5f0eb',
          100: '#e8dfd5',
          200: '#d0bfaa',
          300: '#b89e84',
          400: '#9a7d5f',
          500: '#7c5c3e',
          600: '#634a31',
          700: '#4a3824',
          800: '#2e2317',
          900: '#1a1409',
        },
        washi: '#f9f5f0',
        vermillion: '#c0392b',
        indigo: '#2c3e7a',
        moss: '#3d6b4f',
        gold: '#c49a2c',
        slate: '#4a5568',
      },
    },
  },
  plugins: [],
}
