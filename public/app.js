/* Tidepool front-end. Vanilla JS, no build step. */

let board = null

const $ = (sel) => document.querySelector(sel)

function showBanner(message, kind = "error") {
  const el = $("#banner")
  el.textContent = message
  el.className = `banner ${kind}`
  el.hidden = false
}

function clearBanner() {
  $("#banner").hidden = true
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(`${options?.method || "GET"} ${path} failed: ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

async function load() {
  board = await api("/api/board")
  render()
}

function render() {
  const filter = $("#search").value.trim().toLowerCase()
  const root = $("#board")
  root.innerHTML = ""
  root.setAttribute("aria-busy", "false")

  let visible = 0

  board.columns.forEach((column, columnIndex) => {
    const cards = column.cards.filter((c) => !filter || c.title.toLowerCase().includes(filter))
    visible += cards.length

    const section = document.createElement("section")
    section.className = "column"
    section.dataset.columnId = column.id

    const head = document.createElement("header")
    head.innerHTML = `<h2>${column.title}</h2><span class="count">${cards.length}</span>`
    section.appendChild(head)

    const list = document.createElement("ul")
    list.className = "cards"

    if (cards.length === 0) {
      const empty = document.createElement("li")
      empty.className = "empty"
      empty.textContent = "Nothing here yet"
      list.appendChild(empty)
    }

    cards.forEach((card) => {
      const item = document.createElement("li")
      item.className = "card"
      item.dataset.cardId = card.id

      const title = document.createElement("span")
      title.className = "title"
      title.textContent = card.title
      item.appendChild(title)

      const tag = document.createElement("span")
      tag.className = `tag tag-${card.tag}`
      tag.textContent = card.tag
      item.appendChild(tag)

      const controls = document.createElement("div")
      controls.className = "controls"

      if (columnIndex > 0) {
        const left = document.createElement("button")
        left.type = "button"
        left.className = "move"
        left.title = `Move "${card.title}" to ${board.columns[columnIndex - 1].title}`
        left.setAttribute("aria-label", left.title)
        left.textContent = "←"
        left.onclick = () => moveCard(card.id, board.columns[columnIndex - 1].id)
        controls.appendChild(left)
      }

      if (columnIndex < board.columns.length - 1) {
        const right = document.createElement("button")
        right.type = "button"
        right.className = "move"
        right.title = `Move "${card.title}" to ${board.columns[columnIndex + 1].title}`
        right.setAttribute("aria-label", right.title)
        right.textContent = "→"
        right.onclick = () => moveCard(card.id, board.columns[columnIndex + 1].id)
        controls.appendChild(right)
      }

      const del = document.createElement("button")
      del.type = "button"
      del.className = "delete"
      del.title = `Delete "${card.title}"`
      del.setAttribute("aria-label", del.title)
      del.textContent = "×"
      del.onclick = () => deleteCard(card.id)
      controls.appendChild(del)

      item.appendChild(controls)
      list.appendChild(item)
    })

    section.appendChild(list)

    const form = document.createElement("form")
    form.className = "add"
    form.innerHTML = `
      <input type="text" name="title" placeholder="Add a card…" aria-label="Add a card to ${column.title}" />
      <button type="submit">Add</button>`
    form.onsubmit = async (event) => {
      event.preventDefault()
      const input = form.querySelector("input")
      const title = input.value.trim()
      if (!title) return
      input.value = ""
      await api("/api/cards", { method: "POST", body: JSON.stringify({ columnId: column.id, title }) })
      await load()
    }
    section.appendChild(form)

    root.appendChild(section)
  })

  $("#card-count").textContent = `${visible} card${visible === 1 ? "" : "s"}`
}

async function moveCard(cardId, columnId) {
  clearBanner()
  try {
    await api(`/api/cards/${cardId}`, { method: "PATCH", body: JSON.stringify({ columnId }) })
    await load()
  } catch (err) {
    showBanner(`Could not move card: ${err.message}`)
  }
}

async function deleteCard(cardId) {
  clearBanner()
  try {
    await api(`/api/cards/${cardId}`, { method: "DELETE" })
    await load()
  } catch (err) {
    showBanner(`Could not delete card: ${err.message}`)
  }
}

function wire() {
  $("#search").oninput = () => board && render()
  $("#reset").onclick = async () => {
    await api("/api/reset", { method: "POST" })
    clearBanner()
    await load()
  }
  window.addEventListener("error", (event) => {
    showBanner(`Unexpected error: ${event.message}`)
  })
  window.addEventListener("unhandledrejection", (event) => {
    showBanner(`Unexpected error: ${event.reason && event.reason.message}`)
  })
}

wire()
load().catch((err) => showBanner(`Could not load the board: ${err.message}`))
