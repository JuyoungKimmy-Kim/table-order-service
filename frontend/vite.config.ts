import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 중 백엔드 연결: /api, /api/admin/stream(SSE) 를 FastAPI(:8000)로 프록시.
// 배포 시에는 리버스 프록시가 동일 경로를 백엔드로 라우팅한다고 가정.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        // SSE 스트림이 버퍼링되지 않도록 유지
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept-Encoding', 'identity')
          })
        },
      },
    },
  },
})
