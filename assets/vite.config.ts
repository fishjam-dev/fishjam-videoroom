import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig((configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), "");

  return ({
    server: {
      // https://vitejs.dev/config/server-options.html#server-host
      // true - listen on all addresses, including LAN and public addresses
      host: false,
      // https: true,
      port: 5005,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.API_URL ?? "http://0.0.0.0:5004",
          changeOrigin: !!env.API_URL
        },
        "/socket/peer/websocket": {
          ws: true,
          target: "ws://127.0.0.1:5002",
          changeOrigin: false
        }
      }
    },
    plugins: [
      react(),
      checker({
        typescript: true,
        eslint: {
          lintCommand: "eslint --ext .ts,.tsx"
        }
      })
    ]
  });
});
