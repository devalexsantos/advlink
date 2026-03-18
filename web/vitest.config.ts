import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "lib/**",
        "app/api/**",
        "components/**",
        "app/profile/**",
        "hooks/**",
      ],
      exclude: [
        "**/__tests__/**",
        "**/node_modules/**",
        "**/*.d.ts",
        "components/ui/**",
        "components/themes/0[1-4]/**",
        "components/MetaPixel.tsx",
        "components/analytics/**",
        "app/profile/analytics/types.ts",
        "app/profile/edit/types.ts",
      ],
    },
  },
})
