import react from "@vitejs/plugin-react";

import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // required for @primer/react
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    minify: false,
  },
});
