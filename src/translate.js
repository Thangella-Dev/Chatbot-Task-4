const { HfInference } = require("@huggingface/inference");

const HF_TOKEN = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "").trim();
const HF_PROVIDER = (process.env.HF_PROVIDER || "hf-inference").trim() || "hf-inference";
const HF_TRANSLATE_MODEL = (process.env.HF_TRANSLATE_MODEL || "").trim();

// Prefer high-quality, pair-specific translation models where available on HF Inference Providers.
// For languages not covered here, Gemini is recommended for best translation quality.
const OPUS_MT_MODELS = {
  hi: "Helsinki-NLP/opus-mt-hi-en",
  // Best-effort multilingual -> English fallback (quality varies).
  "*": "Helsinki-NLP/opus-mt-mul-en",
};

const OPUS_MT_EN_TO = {
  hi: "Helsinki-NLP/opus-mt-en-hi",
  ur: "Helsinki-NLP/opus-mt-en-ur",
};

function canUseHfTranslate() {
  return Boolean(HF_TOKEN);
}

async function hfTranslateToEnglish(text, sourceLangCode) {
  if (!HF_TOKEN) return null;
  const lang = String(sourceLangCode || "").toLowerCase().trim();
  const model = HF_TRANSLATE_MODEL || OPUS_MT_MODELS[lang] || OPUS_MT_MODELS["*"] || null;
  if (!model) return null;

  const hf = new HfInference(HF_TOKEN);
  const out = await hf.translation({
    provider: HF_PROVIDER,
    model,
    inputs: String(text || ""),
  });
  const translated = String(out?.translation_text || "").trim();
  return translated || null;
}

async function hfTranslateFromEnglish(text, targetLangCode) {
  if (!HF_TOKEN) return null;
  const lang = String(targetLangCode || "").toLowerCase().trim();
  if (!lang || lang === "en") return null;
  const model = OPUS_MT_EN_TO[lang] || null;
  if (!model) return null;

  const hf = new HfInference(HF_TOKEN);
  const out = await hf.translation({
    provider: HF_PROVIDER,
    model,
    inputs: String(text || ""),
  });
  const translated = String(out?.translation_text || "").trim();
  return translated || null;
}

module.exports = { canUseHfTranslate, hfTranslateToEnglish, hfTranslateFromEnglish, HF_TRANSLATE_MODEL };
