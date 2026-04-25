const http = require("http");

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: true,
      port: PORT,
      time: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server listening on 0.0.0.0:${PORT}`);
});
