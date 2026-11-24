
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
	search: resolve(process.cwd(), 'search.html'),
        detail: resolve(process.cwd(), 'detail.html'),
        auth: resolve(process.cwd(), 'auth.html'),
        account: resolve(process.cwd(), 'account.html'),
        admin: resolve(process.cwd(), 'admin.html'),
edu: resolve(process.cwd(), 'edu.html'),
quiz: resolve(process.cwd(), 'quiz.html'),
ai: resolve(process.cwd(), 'ai.html'),
library: resolve(process.cwd(), 'library.html'),
timeline: resolve(process.cwd(), 'timeline.html'),
eventDetail: resolve(process.cwd(), 'event-detail.html')
      }
    }
  }
});
