const { HfInference } = require("@huggingface/inference");

const state = {
  // HF "Inference Providers" do not currently expose provider routing metadata for some audio LID models
  // (e.g. `facebook/mms-lid-126`). We auto-disable audio LID if the provider reports it as unsupported.
  available: true,
  token: (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "").trim(),
  tokenSet: false,
  provider: (process.env.HF_PROVIDER || "hf-inference").trim() || "hf-inference",
  model: (process.env.HF_AUDIO_LID_MODEL || "facebook/mms-lid-126").trim() || "facebook/mms-lid-126",
  lastError: null,
  lastErrorAt: null,
};
state.tokenSet = Boolean(state.token);

function setError(message) {
  state.lastError = message;
  state.lastErrorAt = message ? new Date().toISOString() : null;
}

function getAudioContentType({ mimetype, filename, buffer }) {
  const mt = String(mimetype || "").trim().toLowerCase();
  if (mt.startsWith("audio/")) return mt;

  const name = String(filename || "").trim().toLowerCase();
  if (name.endsWith(".wav") || name.endsWith(".wave")) return "audio/wav";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".webm")) return "audio/webm";
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".m4a")) return "audio/m4a";

  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (b.length >= 12) {
    const riff = b.toString("ascii", 0, 4) === "RIFF";
    const wave = b.toString("ascii", 8, 12) === "WAVE";
    if (riff && wave) return "audio/wav";
  }

  return null;
}

// ISO639-3 -> ISO639-1 for common outputs (extend as needed).
const ISO3_TO_1 = {
  eng: "en",
  hin: "hi",
  tel: "te",
  tam: "ta",
  kan: "kn",
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

function normalizeLangCode(label) {
  const t = String(label || "").trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.length === 2) return lower;
  if (lower.length === 3) return ISO3_TO_1[lower] || null;
  // Some models return labels like "lang:tel"
  const m = lower.match(/([a-z]{3})/);
  if (m && m[1]) return ISO3_TO_1[m[1]] || null;
  return null;
}

async function detectSpokenLanguage(audio) {
  if (!state.available) return null;
  if (!state.tokenSet) return null;
  const buf = audio?.buffer;
  if (!buf || !Buffer.isBuffer(buf) || !buf.length) return null;

  try {
    const contentType = getAudioContentType(audio);
    if (!contentType) {
      setError("Unknown audio content-type for LID");
      return null;
    }

    const hf = new HfInference(state.token);
    const blob = new Blob([buf], { type: contentType });

    let out = null;
    try {
      out = await hf.audioClassification({
        provider: state.provider,
        model: state.model,
        data: blob,
      });
    } catch (e1) {
      const detail1 = e1?.httpResponse?.body?.error || e1?.httpResponse?.body?.message || e1?.message || String(e1);
      const msg1 = String(detail1 || "");
      const looksLikeProviderInfoIssue =
        /inference provider information/i.test(msg1) ||
        /find inference provider/i.test(msg1) ||
        /provider.*information/i.test(msg1);

      if (looksLikeProviderInfoIssue) {
        // Auto-disable to avoid spamming errors on every /voice-chat call.
        state.available = false;
        setError(
          "Audio language-ID is not supported by the configured Hugging Face provider right now. Falling back to Whisper multi-pass + text language detection."
        );
        return null;
      }
      throw e1;
    }

    const arr = Array.isArray(out) ? out : [];
    if (!arr.length) {
      setError("HF audio LID returned empty output");
      return null;
    }

    const best = arr.reduce((a, b) => (Number(b?.score || 0) > Number(a?.score || 0) ? b : a), arr[0]);
    const label = best?.label;
    const score = Number(best?.score || 0) || 0;
    const code = normalizeLangCode(label);
    if (!code) {
      setError(`HF audio LID label not recognized: ${String(label)}`);
      return null;
    }
    setError(null);
    return { code, score, label: String(label), detector: "hf_audio_lid" };
  } catch (e) {
    const status = e?.httpResponse?.status;
    const detail = e?.httpResponse?.body?.error || e?.httpResponse?.body?.message || e?.message || String(e);
    setError(status ? `HF audio LID failed (${status}): ${detail}` : `HF audio LID failed: ${detail}`);
    return null;
  }
}

module.exports = { detectSpokenLanguage, hfAudioLidState: state };
