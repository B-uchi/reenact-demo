# What is planted in here

Tidepool is a real, working kanban board — no dependencies, `node server.js` and
it runs. It is also the test fixture for [Reenact](../reenact), so it has two
bugs deliberately buried in a 60-commit history.

Knowing where they are spoils nothing: the point is that Reenact finds them from
a bug report alone.

## Bug A — Export crashes when a column is empty

`public/app.js`, in `summarise()`:

```js
const lead = column.cards[0]
lines.push(`${column.title} (${column.cards.length}) — top: ${lead.title}`)
```

The seed board ships with an empty **Done** column, so a fresh install crashes on
the first Export. Introduced by **"Add board export"** — the commit that added
the feature, which is the honest answer.

## Bug B — Moving a card doesn't stick

`server.js`, in the `PATCH /api/cards/:id` handler:

```js
const update = {
  columnId: body.column_id,   // the client has always sent `columnId`
  ...
}
```

The move is accepted, returns 200, and is silently dropped. The UI reloads from
the server and the card is exactly where it was.

Introduced by **"refactor: normalise the card update payload"** — a tidy-up
commit with no behaviour change intended, 34 commits before HEAD. `v0.4.0` is
the last release without it; `v0.5.0` and later are broken.

This is the one worth watching Reenact find: there is no error message, no
console output, and no stack trace. The only evidence is that clicking the
button changes nothing.

## Rebuilding the history

The repository is generated, so it can be regenerated identically:

```bash
cd ../reenact && node tools/build-demo-history.mjs --force
```

The script asserts that HEAD matches the canonical app byte-for-byte, and that
each bug is absent at its culprit's parent and present at the culprit itself.
Commit SHAs are stable across rebuilds; `.reenact-demo-facts.json` records them.
