import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // 将所有以 /api 开头的请求代理到后端服务
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
        // 如果后端接口不带 /api 前缀，可以重写路径
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
