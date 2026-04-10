# Requirements (Chatbot‑V2 / VoiceFlow)

This project is **Node.js + Express + PostgreSQL**. There is **no Python** and no `.venv` used.

## installed

### 1) Node.js (includes npm)
- **Why:** runs the backend server and DB scripts.
- **Check:** `node -v` and `npm -v`

### 2) PostgreSQL server
- **Why:** stores the knowledge base (`knowledge` + `knowledge_i18n` tables).
- **Check:** run the server and open `http://127.0.0.1:8000/status` (DB must be `ok: true`)

### 3) Browser (Chrome/Edge recommended)
- **Why:** runs the frontend UI + mic recording.
- **Open:** `http://127.0.0.1:8000/`

## Internet: when it is needed
- **Text chat (database answers):** works offline (no internet required).
- **Voice transcription (`/voice-chat`):** needs internet + `HF_TOKEN` (Whisper runs on Hugging Face).
- **Weather:** needs internet (Open‑Meteo).
- **Gemini:** optional and disabled by default; if enabled it needs internet + API key.

## Environment variables (`.env`)

### Required
- `DATABASE_URL` — Postgres connection string for the backend.

### Optional (recommended for voice)
- `HF_TOKEN` — enables Hugging Face (Whisper transcription + multilingual helpers).

### Optional (AI fallback)
- `GEMINI_ENABLED` — set to `1` to enable.
- `GEMINI_API_KEY` — required when Gemini is enabled.

## npm packages (what they do)
Installed automatically with `npm install`:
- `express` — HTTP server + API routes (`server.js`)
- `cors` — allows browser frontend to call the API
- `dotenv` — loads `.env`
- `pg` — Postgres driver
- `multer` — accepts audio uploads for `/voice-chat`
- `@huggingface/inference` — calls Whisper + language/embedding/translation helpers (when `HF_TOKEN` is set)
- `franc-min` — local fallback language detection (text)
- `@google/generative-ai` — Gemini client (only used when enabled)

