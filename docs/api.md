# API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/board` | Whole board |
| POST | `/api/cards` | Create a card |
| PATCH | `/api/cards/:id` | Update a card |
| DELETE | `/api/cards/:id` | Remove a card |
| POST | `/api/reset` | Restore the seed |

`PATCH` accepts `title`, `tag`, `columnId` and `position`.
