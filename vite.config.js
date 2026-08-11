import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端开发服务器将 /api 转发到本地后端（默认 3001），
// 由后端统一处理鉴权与 DeepSeek 代理，前端不直接暴露 Key、也不直连 DeepSeek。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
