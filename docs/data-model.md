# Data model

A board has ordered `columns`; each column has ordered `cards`.

```json
{ "columns": [{ "id": "todo", "title": "To Do", "cards": [] }] }
```

Ids are stable strings. Order in the array is the order on screen.
