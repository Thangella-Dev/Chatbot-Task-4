const { franc } = require("franc-min");
const { geminiGenerateText, geminiState } = require("./gemini");
const { hfDetectLanguage } = require("./langid");

const LANGUAGE_NAMES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  gu: "Gujarati",
  mr: "Marathi",
  ur: "Urdu",
  ar: "Arabic",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  "zh-cn": "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  id: "Indonesian",
  ms: "Malay",
  pa: "Punjabi",
  fa: "Persian",
  ru: "Russian",
  fi: "Finnish",
  sw: "Swahili",
};

// Minimal ISO639-3 to ISO639-1 mapping for franc output (extend as needed).
const ISO3_TO_1 = {
  eng: "en",
  hin: "hi",
  tel: "te",
  tam: "ta",
  ben: "bn",
  mar: "mr",
  guj: "gu",
  mal: "ml",
  urd: "ur",
  ara: "ar",
  spa: "es",
  fra: "fr",
  deu: "de",
  por: "pt",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  rus: "ru",
  fin: "fi",
  swa: "sw",
  ind: "id",
  msa: "ms",
  pan: "pa",
  fas: "fa",
  zho: "zh-cn",
};

function detectByScript(text) {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x0c00 && code <= 0x0c7f) return { code: "te", name: LANGUAGE_NAMES.te, detector: "script" };
    if (code >= 0x0900 && code <= 0x097f) return { code: "hi", name: LANGUAGE_NAMES.hi, detector: "script" };
    if (code >= 0x0980 && code <= 0x09ff) return { code: "bn", name: LANGUAGE_NAMES.bn, detector: "script" };
    if (code >= 0x0a80 && code <= 0x0aff) return { code: "gu", name: LANGUAGE_NAMES.gu, detector: "script" };
    if (code >= 0x0b80 && code <= 0x0bff) return { code: "ta", name: LANGUAGE_NAMES.ta, detector: "script" };
    if (code >= 0x0d00 && code <= 0x0d7f) return { code: "ml", name: LANGUAGE_NAMES.ml, detector: "script" };
    if (code >= 0x0600 && code <= 0x06ff) return { code: "ur", name: LANGUAGE_NAMES.ur, detector: "script" };
  }
  return null;
}

function detectWithFranc(text) {
  const iso3 = franc(text, { minLength: 3 });
  if (!iso3 || iso3 === "und") return null;
  const code = ISO3_TO_1[iso3] || null;
  if (!code) return null;
  return { code, name: LANGUAGE_NAMES[code] || code, detector: "local" };
}

async function detectWithHfLangId(text) {
  const out = await hfDetectLanguage(text);
  if (!out?.code) return null;
  return { code: out.code, name: LANGUAGE_NAMES[out.code] || out.code, detector: out.detector, score: out.score };
}

async function detectWithGemini(text, hintLocale) {
  if (!geminiState.langDetectEnabled) return null;
  const prompt = hintLocale
    ? `Detect the language of this user text. If unsure, prefer this hint locale: ${hintLocale}. Return ONLY a JSON object with keys code (ISO 639-1) and name. Text: """${text}"""`
    : `Detect the language of this user text. Return ONLY a JSON object with keys code (ISO 639-1) and name. Text: """${text}"""`;
  const out = await geminiGenerateText(prompt);
  if (!out) return null;
  try {
    const obj = JSON.parse(out);
    const code = String(obj.code || "").toLowerCase().trim();
    const name = obj.name || LANGUAGE_NAMES[code] || code;
    if (!code) return null;
    return { code, name, detector: "gemini" };
  } catch {
    return null;
  }
}

async function detectLanguage(text, hintLocale = null) {
  const script = detectByScript(text);
  if (script && script.code !== "ur") return script;

  const hf = await detectWithHfLangId(text);
  if (hf) return hf;

  const local = detectWithFranc(text);
  if (local) return local;

  // If we only saw Arabic script (often Urdu/Arabic), keep the script result as a fallback.
  if (script) return script;

  const gem = await detectWithGemini(text, hintLocale);
  if (gem) return gem;

  return null;
}

module.exports = { detectLanguage };
