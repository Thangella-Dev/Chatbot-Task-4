# Flowchart (Node.js + Postgres)

```mermaid
flowchart TD
  U[User] -->|Type message| UI[Frontend UI]
  U -->|Speak (mic)| MIC[MediaRecorder]

  UI -->|GET /quick-questions| API[Node/Express API]
  UI -->|POST /chat/query| API
  UI -->|POST /detect-language| API
  MIC -->|POST /voice-chat (audio/wav 16kHz)| API

  API -->|Weather intent| WX[Open‑Meteo]
  API -->|Intent/paraphrase + semantic match| MATCH[KB Matching]
  MATCH --> PG[(Postgres: knowledge / knowledge_i18n)]

  API -->|Whisper ASR| HF1[Hugging Face: Whisper]
  API -->|Text language-ID| HF2[Hugging Face: LangID]
  API -->|Embeddings (semantic)| HF3[Hugging Face: Embeddings]
  API -->|Optional translate to EN| HF4[Hugging Face: Translate]

  API -->|Optional fallback| G[Gemini (disabled by default)]
  API -->|If out-of-scope| FB[Guided fallback message]

  API -->|JSON response (includes transcribed_text for voice)| UI
  UI -->|Render messages + suggested questions| FEED[Chat Feed]
```
