import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // 输出到 server 目录
    outDir: '../server/dist',
    emptyOutDir: true,
    // 每次编译生成不同的文件名（包含内容哈希）
    rollupOptions: {
      output: {
        // JS 文件：[name].[hash].js
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        // CSS 和其他资源：[name].[hash].[ext]
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  server: {
    port: 80,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 支付相关路由
      '/pay': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 兼容易支付路由
      '/submit.php': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/mapi.php': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api.php': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
