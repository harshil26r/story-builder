import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(() => {
  const port = process.env.PORT || 5000;
  const apiTarget = process.env.VITE_API_TARGET || `http://localhost:${port}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true
        },
        '^/s/.*': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          bypass: (req: any) => {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
            return undefined;
          }
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
})