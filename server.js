const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const { dbPing, getAnswerByIntentOrDb, getQuickQuestions, getLocalizedAnswer, resetSemanticCache } = require("./src/knowledge");
const { detectLanguage } = require("./src/language");
const { getCurrentWeatherAnswerIfAny } = require("./src/weather");
const { geminiGenerateText, geminiState } = require("./src/gemini");
const { whisperTranscribe, hfState } = require("./src/huggingface");
const { canUseHfTranslate, hfTranslateToEnglish, hfTranslateFromEnglish, HF_TRANSLATE_MODEL } = require("./src/translate");
const { hfLangIdState } = require("./src/langid");
const { hfSemanticState } = require("./src/semantic");
const { detectSpokenLanguage, hfAudioLidState } = require("./src/audioLang");

function fallbackMessage(languageCode) {
  const lc = String(languageCode || "").toLowerCase().trim();
  if (lc === "hi") {
    return (
      "माफ़ कीजिए, मुझे इसका जवाब अभी नहीं पता।\n\n" +
      "यह डिलीवरी असिस्टेंट केवल डिलीवरी के प्रकार, उपलब्ध आइटम, डिलीवरी समय, ऑर्डर ट्रैकिंग और पेमेंट मेथड्स से जुड़े सवालों में मदद कर सकता/सकती है।\n\n" +
      "टिप: नीचे दिए गए सुझाए गए सवालों में से किसी एक पर क्लिक करें।"
    );
  }
  if (lc === "te") {
    return (
      "క్షమించండి, దీనికి నాకు ఇప్పుడే సమాధానం తెలియదు.\n\n" +
      "ఈ డెలివరీ అసిస్టెంట్ డెలివరీ రకాలూ, అందుబాటులో ఉన్న వస్తువులు, డెలివరీ సమయాలు, ఆర్డర్ ట్రాకింగ్, చెల్లింపు విధానాల గురించి మాత్రమే సహాయం చేస్తుంది.\n\n" +
      "టిప్: క్రింద ఉన్న సూచించిన ప్రశ్నలలో ఏదైనా ఒకదాన్ని క్లిక్ చేయండి."
    );
  }
  return (
    "I'm not sure about that yet.\n\n" +
    "You are not asking a question related to this delivery assistant. Try asking about: delivery types, available items, delivery hours, order tracking, or payment methods.\n\n" +
    "Tip: click one of the suggested questions to get a relevant response."
  );
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const PORT = Number(process.env.PORT || 8000);
const API_HOST = process.env.HOST || "127.0.0.1";

app.get("/", (_req, res) => res.json({ status: "ok" }));

app.get("/status", async (_req, res) => {
  const db = await dbPing().catch((e) => ({ ok: false, error: String(e?.message || e) }));
  let i18nReady = false;
  try {
    const { pool } = require("./src/db");
    const r = await pool.query("select to_regclass('public.knowledge_i18n') as t");
    i18nReady = Boolean(r.rows?.[0]?.t);
  } catch {
    i18nReady = false;
  }
  res.json({
    status: "ok",
    port: PORT,
    db: db,
    hf_available: hfState.available,
    hf_token_set: hfState.tokenSet,
    hf_model: hfState.model,
    hf_provider: hfState.provider,
    hf_last_error: hfState.lastError,
    hf_last_error_at: hfState.lastErrorAt,
    hf_translate_available: canUseHfTranslate(),
    hf_translate_model: HF_TRANSLATE_MODEL || null,
    hf_langid_available: hfLangIdState.available,
    hf_langid_token_set: hfLangIdState.tokenSet,
    hf_langid_model: hfLangIdState.model,
    hf_langid_last_error: hfLangIdState.lastError,
    hf_langid_last_error_at: hfLangIdState.lastErrorAt,
    hf_embed_available: hfSemanticState.available,
    hf_embed_token_set: hfSemanticState.tokenSet,
    hf_embed_model: hfSemanticState.model,
    hf_embed_last_error: hfSemanticState.lastError,
    hf_embed_last_error_at: hfSemanticState.lastErrorAt,
    hf_audio_lid_available: hfAudioLidState.available,
    hf_audio_lid_token_set: hfAudioLidState.tokenSet,
    hf_audio_lid_model: hfAudioLidState.model,
    hf_audio_lid_last_error: hfAudioLidState.lastError,
    hf_audio_lid_last_error_at: hfAudioLidState.lastErrorAt,
    i18n_ready: i18nReady,
    gemini_available: geminiState.available,
    gemini_enabled: geminiState.enabled,
    gemini_key_set: geminiState.keySet,
    gemini_model: geminiState.model,
    gemini_lang_detect: geminiState.langDetectEnabled,
    gemini_last_error: geminiState.lastError,
    gemini_last_error_at: geminiState.lastErrorAt,
  });
});

app.get("/quick-questions", async (_req, res) => {
  const questions = await getQuickQuestions();
  res.json({ questions });
});

app.post("/detect-language", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const hintLocale = String(req.body?.hint_locale || "").trim().toLowerCase() || null;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const result = await detectLanguage(text, hintLocale);
  if (!result) return res.status(400).json({ error: "Could not detect language" });

  res.json({
    language_code: result.code,
    language_name: result.name,
    language_hint: `You are speaking ${result.name}.`,
    detector: result.detector,
  });
});

app.post("/chat/query", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "No text provided" });

  const userLang = await detectLanguage(text).catch(() => null);

  // 1) Weather (live)
  const weather = await getCurrentWeatherAnswerIfAny(text);
  if (weather) {
    const lc = userLang?.code || "en";
    return res.json({ user_text: text, bot_response: weather, source: "weather", language_code: lc, language_name: userLang?.name || null });
  }

  // 2) Intent + DB
  const kb = await getAnswerByIntentOrDb(text);
  if (kb) {
    const lc = userLang?.code || "en";
    const localized = kb.question_norm ? await getLocalizedAnswer(kb.question_norm, lc) : null;
    const translated = !localized && lc !== "en" ? await hfTranslateFromEnglish(kb.answer, lc).catch(() => null) : null;
    return res.json({
      user_text: text,
      bot_response: localized || translated || kb.answer,
      source: localized ? "knowledge_i18n" : translated ? "hf_translate" : kb.source,
      language_code: lc,
      language_name: userLang?.name || null,
      intent_key: kb.question_norm || null,
      answer_en: kb.answer,
    });
  }

  // 3) Optional Gemini fallback
  const gem = await geminiGenerateText(text);
  if (gem) {
    const lc = userLang?.code || "en";
    return res.json({ user_text: text, bot_response: gem, source: "gemini", language_code: lc, language_name: userLang?.name || null });
  }

  // 4) Local fallback (no debug link)
  const lc = userLang?.code || "en";
  res.json({ user_text: text, bot_response: fallbackMessage(lc), source: "fallback", language_code: lc, language_name: userLang?.name || null });
});

app.post("/translate", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const target = String(req.body?.target || "en").trim().toLowerCase();
  const sourceName = String(req.body?.source_language_name || "").trim();
  const sourceCode = String(req.body?.source_language_code || "").trim().toLowerCase() || null;
  if (!text) return res.status(400).json({ error: "No text provided" });
  if (target !== "en") return res.status(400).json({ error: "Only target=en is supported right now." });

  // 1) Prefer Gemini if configured
  if (geminiState.keySet) {
    const systemInstruction =
      "You are a translation engine. Translate the user's text to English. Output ONLY the translated English text. Do not add explanations, quotes, or extra formatting.";
    const prompt = sourceName ? `Translate from ${sourceName} to English:\n\n${text}` : `Translate to English:\n\n${text}`;

    const out = await geminiGenerateText(prompt, { systemInstruction });
    if (out) return res.json({ translated_text: out, target: "en", source: "gemini" });
  }

  // 2) Fallback to Hugging Face translation (NLLB) if possible
  let langCode = sourceCode;
  if (!langCode) {
    const det = await detectLanguage(text).catch(() => null);
    langCode = det?.code || null;
  }
  const hf = await hfTranslateToEnglish(text, langCode);
  if (hf) return res.json({ translated_text: hf, target: "en", source: "huggingface", source_language_code: langCode });

  const why = geminiState.keySet
    ? "Translation failed."
    : "English translation needs `GEMINI_API_KEY` (recommended). Hugging Face fallback translation is only available for a limited set of languages right now.";
  return res.status(503).json({ error: why });
});

app.post("/voice-chat", upload.any(), async (req, res) => {
  const file = (req.files || []).find((f) => f?.fieldname === "audio") || (req.files || [])[0];
  if (!file?.buffer) return res.status(400).json({ error: "No audio file provided. Send multipart/form-data with field name 'audio'." });
  const languageHintRaw = String(req.body?.language_hint || "").trim().toLowerCase() || "auto";
  const hintLocale = String(req.body?.language_hint_locale || "").trim().toLowerCase() || null;
  const clientLanguagesRaw = String(req.body?.client_languages || "").trim();
  const clientLangHints = (() => {
    try {
      const arr = JSON.parse(clientLanguagesRaw);
      if (!Array.isArray(arr)) return [];
      const supported = new Set(["hi", "te", "ta", "kn", "ml", "bn", "mr", "gu", "ur"]);
      const out = [];
      for (const tag of arr) {
        const t = String(tag || "").toLowerCase().trim();
        if (!t) continue;
        const code = t.split("-")[0];
        if (!supported.has(code)) continue;
        if (!out.includes(code)) out.push(code);
      }
      return out.slice(0, 3);
    } catch {
      return [];
    }
  })();
  const languageHint = (() => {
    const h = languageHintRaw;
    if (!h || h === "auto") return "auto";
    // Only allow known short language codes.
    return /^[a-z]{2}(-[a-z]{2})?$/.test(h) ? h.slice(0, 2) : "auto";
  })();

  // 1) Whisper transcription (HF)
  const audio = { buffer: file.buffer, mimetype: file.mimetype, filename: file.originalname };
  const audioLid = await detectSpokenLanguage(audio).catch(() => null);
  const tr1 = await whisperTranscribe(audio, { languageHint: "auto" });
  if (!tr1) {
    const hfMsg = (hfState.lastError || "").toLowerCase();
    const permissionHint =
      hfMsg.includes("insufficient permissions") || hfMsg.includes("sufficient permissions") || hfMsg.includes("(403)")
        ? "Your Hugging Face token/account does not have permission for Whisper inference. Create/replace `HF_TOKEN` with a token that has Inference permissions (and ensure your HF account has access), then restart the server."
        : null;
    const contentTypeHint =
      !permissionHint && (hfMsg.includes("content type") || hfMsg.includes("content-type") || hfMsg.includes("(400)"))
        ? "The audio upload is missing a supported content-type. Try a real `.wav` file (recommended) and ensure it’s uploaded as multipart field `audio`."
        : null;

    return res.status(503).json({
      error: "Voice transcription is not available right now.",
      hint: permissionHint || contentTypeHint,
      transcribed_text: "",
      language_code: null,
      language_name: null,
      bot_response: "Voice transcription is not available right now. Please try again.",
      source: "voice_unavailable",
    });
  }

  const text1 = tr1.text.trim();

  // 2) "Detected language" (based on transcript text)
  const lang1 = await detectLanguage(text1, hintLocale).catch(() => null);
  const candList = [{ hint: "auto", text: text1, lang: lang1 }];
  // Quick KB check on the first-pass transcript. If it doesn't match strongly, we
  // broaden Whisper language-hint attempts even when the transcript looks like English.
  // This helps when the user speaks Hindi/Telugu but Whisper auto-transcribes into English.
  const kbFirst = await (async () => {
    try {
      let kb = await getAnswerByIntentOrDb(text1);
      if (!kb && (lang1?.code || "en") !== "en") {
        const enTry = await hfTranslateToEnglish(text1, lang1.code).catch(() => null);
        if (enTry) kb = await getAnswerByIntentOrDb(enTry);
      }
      return kb;
    } catch {
      return null;
    }
  })();
  const kbFirstScore = Number(kbFirst?.match_score || 0) || 0;

  const scoreLang = (l) => {
    if (!l) return 0;
    if (l.detector === "script") return 1.0;
    if (l.detector === "hf_langid") return Number(l.score || 0) || 0;
    return 0.5;
  };

  // Multi-pass Whisper: if locale suggests India and auto-transcription seems wrong, try a couple hints.
  const candidates = [];
  const englishLocale = Boolean((hintLocale && hintLocale.startsWith("en")) || languageHint === "en");

  // If caller hinted a language, try it (including "en") when it differs from the first-pass code.
  if (languageHint !== "auto" && languageHint !== (lang1?.code || "")) candidates.push(languageHint);

  // For India locales (non-English), try common Indic hints.
  if (!englishLocale && hintLocale && /-in\b/.test(hintLocale)) {
    candidates.push("hi", "te", "ta", "kn", "ml");
  }

  // If the first pass is low-confidence, try common hints. (Skip Indic hints if English locale.)
  const baseScore = scoreLang(lang1);
  if (baseScore < 0.8 && !englishLocale) {
    candidates.push("hi", "te", "ta", "kn", "ml");
  }
  if (baseScore < 0.8 && englishLocale) {
    candidates.push("en");
  }

  // If KB doesn't match strongly, still try a couple Indic hints even if the language detector
  // thinks the transcript is confidently English. This improves non-English voice capture on
  // English browser locales.
  if (kbFirstScore < 0.95 && (lang1?.code || "en") === "en") {
    // Prefer the user's browser language preferences (faster and more accurate than trying many).
    if (clientLangHints.length) candidates.push(...clientLangHints);
    else candidates.push("hi", "te");
  }

  // Add audio-based language ID as a strong candidate (if confident).
  if (audioLid?.code && Number(audioLid.score || 0) >= 0.6) {
    candidates.push(audioLid.code);
  }

  const uniq = [...new Set(candidates)].filter((x) => x && x !== "auto" && x !== (lang1?.code || ""));
  for (const hint of uniq.slice(0, 5)) {
    const trX = await whisperTranscribe(audio, { languageHint: hint }).catch(() => null);
    const textX = String(trX?.text || "").trim();
    if (!textX) continue;
    const langX = await detectLanguage(textX, hintLocale).catch(() => null);
    candList.push({ hint, text: textX, lang: langX });
  }

  // 3) Pick the best transcription by: KB match score (highest priority) then language confidence.
  let best = null; // { text, lang, kb, kbQueryText, score }
  for (const c of candList) {
    const lcCand = c.lang?.code || "en";
    let kbQueryText = c.text;
    let kb = await getAnswerByIntentOrDb(kbQueryText);
    if (!kb && lcCand !== "en") {
      const enTry = await hfTranslateToEnglish(c.text, lcCand).catch(() => null);
      if (enTry) {
        kbQueryText = enTry;
        kb = await getAnswerByIntentOrDb(kbQueryText);
      }
    }

    const kbScore = Number(kb?.match_score || 0) || 0;
    const langScore = scoreLang(c.lang);
    const audioBonus = audioLid?.code && c.lang?.code && audioLid.code === c.lang.code ? 0.25 : 0;
    const lenScore = Math.min(String(c.text || "").length / 80, 1) * 0.1;
    const total = kbScore * 2.0 + langScore + audioBonus + lenScore;

    if (!best || total > best.score) {
      best = { text: c.text, lang: c.lang, kb, kbQueryText, score: total };
    }
  }

  const text = best?.text || text1;
  const lang = best?.lang || lang1;
  const lc = (lang?.code || audioLid?.code || (languageHint !== "auto" ? languageHint : "en")) || "en";
  const kb = best?.kb || null;

  if (kb) {
    const localized = kb.question_norm ? await getLocalizedAnswer(kb.question_norm, lc) : null;
    const translated = !localized && lc !== "en" ? await hfTranslateFromEnglish(kb.answer, lc).catch(() => null) : null;
    return res.json({
      transcribed_text: text,
      language_code: lc,
      language_name: lang?.name || null,
      bot_response: localized || translated || kb.answer,
      source: localized ? "knowledge_i18n" : translated ? "hf_translate" : kb.source,
      intent_key: kb.question_norm || null,
      answer_en: kb.answer,
      spoken_language_code: audioLid?.code || null,
      spoken_language_score: typeof audioLid?.score === "number" ? audioLid.score : null,
    });
  }

  // 4) Gemini fallback (optional)
  const systemInstruction =
    lang?.name && String(lang.name).trim()
      ? `The user is speaking in ${String(lang.name).trim()}. Please respond only in that language.`
      : undefined;
  const gem = await geminiGenerateText(text, systemInstruction ? { systemInstruction } : {});
  if (gem) {
    return res.json({
      transcribed_text: text,
      language_code: lc,
      language_name: lang?.name || null,
      bot_response: gem,
      source: "gemini",
    });
  }

  // 5) Limit / failure message (no debug link)
  if (!geminiState.enabled || !geminiState.keySet) {
    return res.json({
      transcribed_text: text,
      language_code: lc,
      language_name: lang?.name || null,
      bot_response: fallbackMessage(lc),
      source: "fallback",
      spoken_language_code: audioLid?.code || null,
      spoken_language_score: typeof audioLid?.score === "number" ? audioLid.score : null,
    });
  }

  const last = (geminiState.lastError || "").toLowerCase();
  const quotaLimited = last.includes("resource_exhausted") || last.includes("quota") || last.includes("rate");
  const limitMsg = process.env.FALLBACK_LIMIT_EXCEEDED_MESSAGE
    ? String(process.env.FALLBACK_LIMIT_EXCEEDED_MESSAGE)
    : quotaLimited
      ? "AI fallback is rate-limited or quota-exhausted right now. Please wait and try again."
      : "AI fallback is not available right now. Please try again.";

  return res.json({
    transcribed_text: text,
    language_code: lang?.code || null,
    language_name: lang?.name || null,
    bot_response: limitMsg,
    source: "limit_exceeded",
  });
});

async function boot() {
  await dbPing();
  try {
    // Ensures the `knowledge` table exists (otherwise give a clearer startup failure)
    await getQuickQuestions();
    resetSemanticCache();
  } catch (e) {
    throw new Error(`Database is reachable, but the knowledge table is missing. Run: npm run db:migrate (then npm run db:seed). Error: ${e?.message || String(e)}`);
  }
  app.listen(PORT, API_HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`VoiceFlow API listening on http://${API_HOST}:${PORT}`);
  });
}

boot().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", e);
  process.exitCode = 1;
});
