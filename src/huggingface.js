const { HfInference } = require("@huggingface/inference");

const state = {
  available: true,
  token: (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "").trim(),
  model: (process.env.HF_WHISPER_MODEL || "openai/whisper-large-v3").trim() || "openai/whisper-large-v3",
  provider: (process.env.HF_PROVIDER || "hf-inference").trim() || "hf-inference",
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

async function whisperTranscribe(audio, opts = {}) {
  if (!state.tokenSet) {
    setError("HF_TOKEN not set");
    return null;
  }
  try {
    const audioBuffer = audio?.buffer ?? audio;
    const data = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer || []);
    if (!data.length) {
      setError("No audio data provided");
      return null;
    }

    const contentType = getAudioContentType({
      mimetype: audio?.mimetype,
      filename: audio?.filename,
      buffer: data,
    });
    if (!contentType) {
      setError("Unsupported or unknown audio content-type. Upload a .wav, .mp3, .webm, .flac, .m4a, or .ogg file.");
      return null;
    }

    // Use the classic HF Inference API client so Node Buffers work reliably.
    // (Some provider-routed clients require Blob + content-type inference.)
    const hf = new HfInference(state.token);
    const blob = new Blob([data], { type: contentType });
    const hint = String(opts.languageHint || "").trim().toLowerCase();
    const params = { task: "transcribe" };
    if (hint && hint !== "auto") {
      // Whisper supports language hints like "hi", "te", etc. If unsupported upstream, it will be ignored.
      params.language = hint;
    }
    const out = await hf.automaticSpeechRecognition({
      provider: state.provider,
      model: state.model,
      parameters: params,
      data: blob,
    });

    const text = String(out?.text || "").trim();
    if (!text) {
      setError("Whisper returned empty transcript");
      return null;
    }
    setError(null);
    return { text };
  } catch (e) {
    const status = e?.httpResponse?.status;
    const detail = e?.httpResponse?.body?.error || e?.httpResponse?.body?.message || e?.message || String(e);
    if (status) {
      setError(`HF Whisper request failed (${status}): ${detail}`);
      return null;
    }
    setError(`HF Whisper request failed: ${e?.name || "Error"}: ${detail}`);
    return null;
  }
}

module.exports = { whisperTranscribe, hfState: state };
