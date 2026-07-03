// @apps-in-toss/web-framework bypass comment
export default {
  appName: "govbenefit-hunter",
  brand: {
    displayName: "정부혜택달력",
    primaryColor: "#0064FF",
    icon: "icon.png",
    iconDark: "icon.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "echo dev",
      build: "node -e \"const fs = require('fs'); if (!fs.existsSync('dist')) fs.mkdirSync('dist'); ['index.html', 'app.js', 'style.css', 'data.json', 'data.js', 'icon.png'].forEach(f => { if (fs.existsSync(f)) fs.copyFileSync(f, 'dist/' + f); })\""
    },
  },
  permissions: [],
  webViewProps: {
    type: "web"
  },
  navigationBar: {
    title: "정부혜택달력"
  },
  outdir: "dist",
};
