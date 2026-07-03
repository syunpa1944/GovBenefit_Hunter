import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "govbenefit-hunter",
  brand: {
    displayName: "정부혜택달력",
    primaryColor: "#0064FF",
    icon: "app_logo_main_1782592690933.png",
    iconDark: "app_logo_main_1782592690933.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
