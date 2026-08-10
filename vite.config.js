import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load .env / .env.local (Vite's own loader, not the browser-unavailable
  // Node process.env) and re-expose each REACT_APP_* key as its own
  // `process.env.KEY` define. The previous `define: { 'process.env': {} }`
  // replaced every `process.env` reference in the app with a literal empty
  // object — so `process.env.REACT_APP_CUSTOMERS_API_URL` always compiled to
  // `undefined` and every call site silently fell back to its hardcoded
  // default, regardless of what .env/.env.local actually said.
  const env = loadEnv(mode, process.cwd(), "");
  const reactAppDefines = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith("REACT_APP_"))
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // Mirrors the production /api rewrite in vercel.json, so local dev
        // also calls the backend same-origin instead of cross-origin.
        "/api": {
          target: "http://localhost:3010",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      ...reactAppDefines,
    },
  };
});
