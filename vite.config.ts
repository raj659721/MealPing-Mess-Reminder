import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isReplit = process.env.REPL_ID !== undefined;

// In Replit: PORT and BASE_PATH are required. In Vercel/CI: fall back to defaults.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async () => {
  const plugins = [
    react(),
    tailwindcss(),
  ];

  if (isReplit && process.env.NODE_ENV !== "production") {
    const { default: runtimeErrorOverlay } = await import(
      "@replit/vite-plugin-runtime-error-modal"
    );
    plugins.push(runtimeErrorOverlay());

    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      })
    );

    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    plugins.push(devBanner());
  }

  return {
    base: basePath,
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: false,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
