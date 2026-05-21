// 事件调度与管理看板 — 静态服务器 + API 路由
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "4000");
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let filePath;

  // /api/* 路由 → 映射到 api/*.json
  if (req.url.startsWith("/api/")) {
    filePath = path.join(ROOT, req.url + ".json");
  } else if (req.url === "/") {
    filePath = path.join(ROOT, "index.html");
  } else {
    filePath = path.join(ROOT, req.url);
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Not Found", path: req.url }));
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✔ 看板服务已启动: http://localhost:${PORT}`);
  console.log(`  API 接口: /api/districts /api/events /api/flowStages /api/aiSuggestions /api/kpi`);
  console.log("  按 Ctrl+C 停止");
});
