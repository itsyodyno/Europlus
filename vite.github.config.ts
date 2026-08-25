import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePath = "/Europlus";

export default defineConfig({
  base: `${basePath}/`,
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath),
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    ),
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    ),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(""),
  },
  build: {
    outDir: "dist-github",
    emptyOutDir: true,
  },
});
