import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "govbenefit-hunter",
  brand: {
    displayName: "정부혜택달력",
    primaryColor: "#0064FF",
    icon: "https://static.toss.im/appsintoss/32871/5e0ee5cb-be2d-47ad-8246-6c33a8882130.png",
    // @ts-ignore
    iconDark: "https://static.toss.im/appsintoss/32871/65073eb6-1b06-4900-91fd-9ee1a5f0480b.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "node build_static.js",
    },
  },
  permissions: [],
  outdir: "dist",
});
