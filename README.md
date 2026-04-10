# Chatbot‑V4 Task 4 (VoiceFlow)

VoiceFlow is a local-first delivery-assistant chatbot with a premium floating widget (text + mic). It uses a **Node.js/Express** backend and a **PostgreSQL** knowledge base to answer delivery FAQs (deliveries, items, hours, tracking, payments).

## Architecture (high level)
- Frontend: `Frontend/` (static HTML/CSS/JS chat widget)
- Backend: `server.js` (Express API server)
- Database: Postgres `knowledge` (+ `knowledge_i18n`) seeded from `db/seeds/*.sql`
- Voice: browser records audio -> backend `/voice-chat` -> Hugging Face Whisper -> KB match -> reply

## Quick start (Windows PowerShell)
From the project folder:
```powershell
npm install
Copy-Item .env.example .env

# Prepare DB tables + demo data
npm run db:migrate
npm run db:seed

# Start the server
npm start
```

Open the UI:
- `http://127.0.0.1:8000/`

Verify backend:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/status | ConvertTo-Json -Depth 6
```

## Configuration
- Required: set `DATABASE_URL` in `.env` (see `.env.example`).
- Optional voice: set `HF_TOKEN` in `.env` to enable `/voice-chat` (requires internet).
- Optional Gemini: set `GEMINI_ENABLED=1` + `GEMINI_API_KEY` (disabled by default).

## Key endpoints
Base URL: `http://127.0.0.1:8000`
- `GET /status` (DB + feature flags + last errors)
- `GET /quick-questions` (suggested question chips from Postgres)
- `POST /chat/query` (text chat: intent/KB/fuzzy + optional semantic -> response)
- `POST /voice-chat` (audio -> Whisper -> KB -> response; returns `transcribed_text`)
- `POST /detect-language` (text language detection)
- `POST /translate` (translate a reply to English; best-effort)

## Offline vs internet
- Works offline (text-only): backend + Postgres + KB answers (intent + exact/fuzzy matching).
- Needs internet:
  - `/voice-chat` uses Hugging Face Whisper (requires `HF_TOKEN` + internet).
  - Semantic matching + some translation helpers use Hugging Face (requires `HF_TOKEN` + internet).
  - Weather answers use Open‑Meteo (internet).
  - Optional Gemini fallback/translation (disabled by default) requires `GEMINI_ENABLED=1` + API key + internet.

## Docs
- Requirements: `REQUIREMENTS.md`
- API + behavior: `Docs/DOCUMENTATION.md`
- Visual flow: `Docs/FLOWCHART.md`
- Demo/PoP steps: `Docs/POP.md`

