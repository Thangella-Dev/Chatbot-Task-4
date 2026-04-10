# Documentation (Node.js + Postgres)

Base URL (default): `http://127.0.0.1:8000`

## Run (Windows PowerShell)
```powershell
cd C:\Users\THANGELLA\Desktop\Chatbot-V2
npm install
Copy-Item .env.example .env

npm run db:migrate
npm run db:seed

npm start
```

Open the UI (recommended):
- `http://127.0.0.1:8000/`

## Endpoints

### GET /
Serves the frontend UI (and acts as a simple health check).

### GET /status
Runtime status for debugging:
- DB connectivity
- Hugging Face features (Whisper / language-ID / embeddings / translation) + last errors
- Gemini flags (Gemini is disabled by default in `.env.example`)
- `i18n_ready` indicates whether `knowledge_i18n` exists (run `npm run db:migrate` + `npm run db:seed`)

### GET /quick-questions
Returns suggested question chips for the UI (from Postgres `knowledge`).

### POST /detect-language
Detects language from text.

Request:
```json
{ "text": "नमस्ते" }
```

Response (example):
```json
{
  "language_code": "hi",
  "language_name": "Hindi",
  "language_hint": "You are speaking Hindi.",
  "detector": "script"
}
```

### POST /chat/query
Main text-chat endpoint.

Request:
```json
{ "text": "what service do you provide", "locale": "en" }
```

Response (example):
```json
{
  "user_text": "what service do you provide",
  "bot_response": "We provide grocery, fresh produce, dairy, bakery, snacks, beverages, household essentials, and personal care deliveries.",
  "source": "intent",
  "language_code": "en",
  "language_name": "English",
  "intent_key": "what kind of deliveries do you provide",
  "answer_en": "We provide grocery, fresh produce, dairy, bakery, snacks, beverages, household essentials, and personal care deliveries."
}
```

Decision order (simplified):
1) Weather intent (Open‑Meteo) when it looks like a weather question.
2) Intent + paraphrase matching for delivery‑assistant topics.
3) Postgres KB lookup (exact / fuzzy / semantic embeddings).
4) If `knowledge_i18n` has a localized answer for the detected language, return it.
5) If no answer is found:
   - If Gemini is enabled: try Gemini.
   - Otherwise: return a guided fallback message (asks user to use delivery‑assistant topics or click suggested questions).

### POST /voice-chat
Voice endpoint: audio -> transcription -> KB match -> response.

Request (multipart/form-data):
- field name: `audio` (recommended: `.wav`)

Response includes the transcript so users can see what they said:
```json
{
  "transcribed_text": "What kind of deliveries do you provide?",
  "language_code": "en",
  "language_name": "English",
  "bot_response": "...",
  "source": "intent",
  "intent_key": "what kind of deliveries do you provide",
  "answer_en": "...",
  "spoken_language_code": null,
  "spoken_language_score": null
}
```

Notes:
- Requires `HF_TOKEN` + internet (Whisper runs via Hugging Face).
- Frontend records audio locally, resamples to 16kHz, and uploads as `audio/wav`.
- Backend may try multiple Whisper passes (auto + a small set of language hints) and selects the transcript that best matches the KB.
- Audio language-ID may be unavailable depending on your Hugging Face provider settings; when unavailable the server falls back to Whisper multi-pass + text language detection.

### POST /translate
Translates a bot response to English (best-effort).

Notes:
- If the response came from the KB, the API also returns `answer_en`, so the UI can often show English instantly without calling `/translate`.
- If Gemini is disabled, translation uses best-effort Hugging Face translation (limited language coverage).

## Environment variables
Use `.env` (see `.env.example`).

Required:
- `DATABASE_URL`

Optional (common):
- `PORT`, `HOST`
- `DEFAULT_CITY` (weather)
- `HF_TOKEN` (enables `/voice-chat` and multilingual helpers)
- `HF_WHISPER_MODEL`, `HF_LANGID_MODEL`, `HF_EMBED_MODEL`
- `GEMINI_ENABLED` (`1` to enable), `GEMINI_API_KEY`, `GEMINI_MODEL`

## Quick API calls (Windows PowerShell)
Windows PowerShell 5.1 note: `curl` is an alias for `Invoke-WebRequest`. For file upload use `curl.exe`.

Create a small WAV test file:
```powershell
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$out = Join-Path $PWD "sample.wav"
$synth.SetOutputToWaveFile($out)
$synth.Speak("What kind of deliveries do you provide?")
$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()
```

Upload to `/voice-chat`:
```powershell
curl.exe -X POST "http://127.0.0.1:8000/voice-chat" -F "audio=@sample.wav"
```

## DB checks (psql)
Connect:
```powershell
psql -U voiceflow -d voiceflow
```

List tables:
```sql
\dt
```

View KB data:
```sql
SELECT id, question, answer, created_at
FROM public.knowledge
ORDER BY id;
```

