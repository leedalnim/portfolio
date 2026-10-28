import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
// 깃헙 페이지 주소가 leedalnim.github.io/portfolio 라서 기본 경로는 /portfolio/
const base = (process.env.BASE_PATH || '/portfolio/').replace(/\/?$/, '/');

export default defineConfig({
  root: here,
  base: base + 'admin/',
  envDir: path.resolve(here, '..'),
  plugins: [react()],
  build: {
    outDir: path.resolve(here, '../dist/admin'),
    emptyOutDir: true,
  },
});
