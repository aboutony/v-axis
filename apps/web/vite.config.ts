import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9000,
    strictPort: true, // Prevents Vite from "hopping" to another port if 9000 is busy
  },
});