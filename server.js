const http = require("http")
const PORT = Number(process.env.PORT || 3000)

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" })
    return res.end(JSON.stringify({ ok: true }))
  }
  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => console.log("tidepool listening on " + PORT))
