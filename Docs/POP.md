# PoP (Proof of Project)

## Goal
Local-first chatbot demo with:
- Static web UI (text + voice)
- Node.js API backend
- Real database server (Postgres)

## What works
- Prompt chips + suggestion chips
- Voice input (browser records audio -> backend Whisper transcription)
- Answers from Postgres knowledge base (delivery assistant dummy data)
- Intent + semantic matching for paraphrases (so users don't need exact wording)
- Weather with city (Open-Meteo live data)
- Optional Gemini fallback/translation (disabled by default)

## Demo steps
1) Start Postgres (local install or hosted)
2) Install + migrate + seed: `npm install`, `npm run db:migrate`, `npm run db:seed`
3) Start backend: `npm start`
4) Open `http://127.0.0.1:8000/` and chat

Notes:
- Offline: text chat still works (DB answers). Voice/weather need internet.
- Voice: requires `HF_TOKEN` in `.env` and internet (Whisper runs via Hugging Face).
