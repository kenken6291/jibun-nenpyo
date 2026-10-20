import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ビルド日時（日本時間）を画面のバージョン情報に表示するため埋め込む
const buildTime = new Date().toLocaleString('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

export default defineConfig({
  plugins: [react()],
  base: '/jibun-nenpyo/',
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
})
