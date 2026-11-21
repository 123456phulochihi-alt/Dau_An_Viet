import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        detail: resolve(process.cwd(), 'detail.html'),
        auth: resolve(process.cwd(), 'auth.html'),
        account: resolve(process.cwd(), 'account.html'),
        admin: resolve(process.cwd(), 'admin.html')
      }
    }
  }
});
