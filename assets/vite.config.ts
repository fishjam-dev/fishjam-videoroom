import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // https://vitejs.dev/config/server-options.html#server-host
    // true - listen on all addresses, including LAN and public addresses
    host: false,
    // https: true,
    port: 5005,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5004",
        changeOrigin: false,
      },
      "/socket/peer/websocket": {
        ws: true,
        target: "ws://127.0.0.1:5002",
        changeOrigin: false,
      },
    },
  },
  plugins: [
    react(),
    // checker({
    //   typescript: false,
    //   eslint: {
    //     lintCommand: "eslint --ext .ts,.tsx",
    //   },
    // }),
  ],
});
