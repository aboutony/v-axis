import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: [/@vaxis\/db/, /@vaxis\/domain/],
});
