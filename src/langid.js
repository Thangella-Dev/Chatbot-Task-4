const { HfInference } = require("@huggingface/inference");

const state = {
  available: true,
  token: (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "").trim(),
  tokenSet: false,
  provider: (process.env.HF_PROVIDER || "hf-inference").trim() || "hf-inference",
  model: (process.env.HF_LANGID_MODEL || "papluca/xlm-roberta-base-language-detection").trim() || "papluca/xlm-roberta-base-language-detection",
  lastError: null,
  lastErrorAt: null,
};
state.tokenSet = Boolean(state.token);

function setError(message) {
  state.lastError = message;
  state.lastErrorAt = message ? new Date().toISOString() : null;
}

// Map common model labels to ISO 639-1 codes.
const LABEL_TO_CODE = {
  English: "en",
  Hindi: "hi",
  Telugu: "te",
  Tamil: "ta",
  Bengali: "bn",
  Marathi: "mr",
  Gujarati: "gu",
  Malayalam: "ml",
  Urdu: "ur",
  Arabic: "ar",
  French: "fr",
  German: "de",
  Spanish: "es",
  Italian: "it",
  Portuguese: "pt",
  Russian: "ru",
  Japanese: "ja",
  Korean: "ko",
  Indonesian: "id",
  Malay: "ms",
  Persian: "fa",
  Punjabi: "pa",
  Swahili: "sw",
  Finnish: "fi",
  Chinese: "zh-cn",
};

function codeFromLabel(label) {
  const t = String(label || "").trim();
  if (!t) return null;
  if (LABEL_TO_CODE[t]) return LABEL_TO_CODE[t];
  // Some models return "LABEL_XX" or "xx"
  const lower = t.toLowerCase();
  if (/^[a-z]{2}(-[a-z]{2})?$/.test(lower)) return lower;
  if (/^label_([a-z]{2})$/.test(lower)) return lower.slice("label_".length);
  return null;
}

async function hfDetectLanguage(text) {
  if (!state.tokenSet) return null;
  const input = String(text || "").trim();
  if (!input) return null;
  try {
    const hf = new HfInference(state.token);
    const out = await hf.textClassification({
      provider: state.provider,
      model: state.model,
      inputs: input,
    });

    const arr = Array.isArray(out) ? out : [];
    if (!arr.length) {
      setError("HF langid returned empty output");
      return null;
    }

    const best = arr.reduce((a, b) => (Number(b?.score || 0) > Number(a?.score || 0) ? b : a), arr[0]);
    const label = best?.label || null;
    const code = codeFromLabel(label);
    const score = Number(best?.score || 0) || 0;
    if (!code) {
      setError(`HF langid returned unsupported label: ${String(label)}`);
      return null;
    }

    setError(null);
    return { code, label: String(label), score, detector: "hf_langid" };
  } catch (e) {
    const status = e?.httpResponse?.status;
    const detail = e?.httpResponse?.body?.error || e?.httpResponse?.body?.message || e?.message || String(e);
    setError(status ? `HF langid failed (${status}): ${detail}` : `HF langid failed: ${detail}`);
    return null;
  }
}

module.exports = { hfDetectLanguage, hfLangIdState: state };

