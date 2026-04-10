/**
 * Tidepool — a small kanban board.
 *
 * Zero dependencies on purpose: `node server.js` and it runs. State lives in
 * data/board.json, reseeded from seed.json when missing.
 */
const http = require("http")
const fs = require("fs")
const path = require("path")

const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data")
const DATA_FILE = path.join(DATA_DIR, "board.json")
const SEED_FILE = path.join(__dirname, "seed.json")
const PUBLIC_DIR = path.join(__dirname, "public")

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
}

function loadBoard() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.copyFileSync(SEED_FILE, DATA_FILE)
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
}

function saveBoard(board) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(board, null, 2))
}

function findCard(board, cardId) {
  for (const column of board.columns) {
    const index = column.cards.findIndex((c) => c.id === cardId)
    if (index !== -1) return { column, index, card: column.cards[index] }
  }
  return null
}

function nextCardId(board) {
  let max = 0
  for (const column of board.columns) {
    for (const card of column.cards) {
      const n = Number(String(card.id).replace(/\D/g, ""))
      if (n > max) max = n
    }
  }
  return `card-${max + 1}`
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ""
    req.on("data", (chunk) => {
      raw += chunk
      if (raw.length > 1e6) reject(new Error("payload too large"))
    })
    req.on("end", () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on("error", reject)
  })
}

function serveStatic(req, res, urlPath) {
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "")
  const file = path.join(PUBLIC_DIR, rel)
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" })
    return res.end("not found")
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
  const p = url.pathname

  try {
    if (p === "/healthz") return json(res, 200, { ok: true, version: require("./package.json").version })

    if (p === "/api/board" && req.method === "GET") {
      return json(res, 200, loadBoard())
    }

    if (p === "/api/cards" && req.method === "POST") {
      const body = await readBody(req)
      const board = loadBoard()
      const column = board.columns.find((c) => c.id === body.columnId) || board.columns[0]
      const card = {
        id: nextCardId(board),
        title: String(body.title || "Untitled").slice(0, 120),
        tag: body.tag || "task",
      }
      column.cards.push(card)
      saveBoard(board)
      return json(res, 201, card)
    }

    const cardMatch = p.match(/^\/api\/cards\/([\w-]+)$/)
    if (cardMatch && req.method === "PATCH") {
      const body = await readBody(req)
      const board = loadBoard()
      const hit = findCard(board, cardMatch[1])
      if (!hit) return json(res, 404, { error: "no such card" })

      // Normalised update payload. See docs/api.md for the accepted fields.
      const update = {
        title: body.title,
        tag: body.tag,
        columnId: body.columnId,
        position: body.position,
      }

      if (update.title !== undefined) hit.card.title = String(update.title).slice(0, 120)
      if (update.tag !== undefined) hit.card.tag = update.tag

      if (update.columnId !== undefined && update.columnId !== hit.column.id) {
        const target = board.columns.find((c) => c.id === update.columnId)
        if (target) {
          hit.column.cards.splice(hit.index, 1)
          const at = Number.isInteger(update.position) ? update.position : target.cards.length
          target.cards.splice(at, 0, hit.card)
        }
      }

      saveBoard(board)
      return json(res, 200, hit.card)
    }

    if (cardMatch && req.method === "DELETE") {
      const board = loadBoard()
      const hit = findCard(board, cardMatch[1])
      if (!hit) return json(res, 404, { error: "no such card" })
      hit.column.cards.splice(hit.index, 1)
      saveBoard(board)
      return json(res, 204, {})
    }

    if (p === "/api/reset" && req.method === "POST") {
      fs.copyFileSync(SEED_FILE, DATA_FILE)
      return json(res, 200, { ok: true })
    }

    if (p.startsWith("/api/")) return json(res, 404, { error: "no such endpoint" })

    return serveStatic(req, res, p)
  } catch (err) {
    return json(res, 500, { error: String((err && err.message) || err) })
  }
})

server.listen(PORT, () => {
  console.log(`tidepool listening on http://localhost:${PORT}`)
})
