import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      name: "nostr-crdt",
      entry: resolve(__dirname, "src/index.ts"),
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        "yjs",
        "vscode-lib",
        "lib0",
        "y-protocols",
        "lodash",
        "another-json",
      ],
    },
  },
  test: {
    setupFiles: "src/setupTests.ts",
    coverage: {
      reporter: ["text", "json", "html", "lcov"],
    },
  },
});
