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
        // 元は単色文字列(indigo: '#2c3e7a')だったため、
        // bg-indigo-700 などの濃淡付きクラスが一切効かなくなっていた不具合を修正。
        // 700 に元の色(#2c3e7a)を据えたグラデーションに変更。
        indigo: {
          50: '#eef1f8',
          100: '#dbe1f0',
          200: '#b8c3e0',
          300: '#8fa0cc',
          400: '#647cb3',
          500: '#465f96',
          600: '#37507f',
          700: '#2c3e7a',
          800: '#23335f',
          900: '#1c2949',
          950: '#12192e',
        },
        moss: '#3d6b4f',
        gold: '#c49a2c',
        // slateも同様に単色文字列だったため、Tailwind標準のslate配色を明示的に採用
        slate: {
          50: '#f8fafc',
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
      },
    },
  },
  plugins: [],
}
