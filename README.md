# Leierskapnetwerk Platform

Webplatform met 'n JavaScript-frontend, Node.js-backend en 'n
Postgres-databasis op Supabase.

## Struktuur

```
backend/       Node.js + Express API
  src/
    server.js    Intree-punt
    db/pool.js   Postgres-verbindingspoel
    routes/      API-roetes
frontend/      HTML, CSS en JavaScript vir die blaaier
database/      SQL-skripte
```

## Opstelling

1. `cd backend && npm install`
2. Kopieer `.env.example` na `.env` en vul jou Supabase-gelooftbriewe in
3. `npm run dev` - die backend loop op http://localhost:3000
4. Maak `frontend/index.html` in 'n blaaier oop

## API

| Metode | Roete | Wat dit doen |
|---|---|---|
| GET | /api/health | Toets of die databasis antwoord |
| GET | /api/notes | Lys alle notas |
| POST | /api/notes | Skep 'n nota (`title` verpligtend) |
