import { defineConfig } from 'vite';

export default defineConfig({
  // Đường dẫn tương đối để build chạy được cả ở thư mục con hoặc static host.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
