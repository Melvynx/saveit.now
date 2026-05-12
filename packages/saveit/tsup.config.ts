import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: { entry: "src/index.ts" },
  clean: true,
  sourcemap: true,
  splitting: false,
  shims: true,
  target: "node18",
  outExtension({ format }) {
    return { js: format === "esm" ? ".js" : ".cjs" };
  },
});
