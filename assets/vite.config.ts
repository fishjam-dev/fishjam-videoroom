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
    port: 4003
  },
  plugins: [react(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint --ext .ts,.tsx"
      }
    })]
});
