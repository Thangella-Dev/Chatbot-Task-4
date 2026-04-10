const { HfInference } = require("@huggingface/inference");

const state = {
  available: true,
  token: (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "").trim(),
  tokenSet: false,
  provider: (process.env.HF_PROVIDER || "hf-inference").trim() || "hf-inference",
  model: (process.env.HF_EMBED_MODEL || "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2").trim() ||
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  lastError: null,
  lastErrorAt: null,
};
state.tokenSet = Boolean(state.token);

function setError(message) {
  state.lastError = message;
  state.lastErrorAt = message ? new Date().toISOString() : null;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

// Small LRU-ish cache
const EMBED_CACHE = new Map(); // key -> { vec, at }
const MAX_CACHE = 250;

async function embedText(text) {
  if (!state.tokenSet) return null;
  const t = String(text || "").trim();
  if (!t) return null;

  const key = t.toLowerCase();
  const hit = EMBED_CACHE.get(key);
  if (hit) {
    hit.at = Date.now();
    return hit.vec;
  }

  try {
    const hf = new HfInference(state.token);
    const out = await hf.featureExtraction({
      provider: state.provider,
      model: state.model,
      inputs: t,
    });

    const vec = Array.isArray(out) ? out.map((n) => Number(n)) : null;
    if (!vec || !vec.length) {
      setError("HF embedding returned empty vector");
      return null;
    }
    setError(null);

    EMBED_CACHE.set(key, { vec, at: Date.now() });
    if (EMBED_CACHE.size > MAX_CACHE) {
      // delete least-recently-used
      let oldestKey = null;
      let oldestAt = Infinity;
      for (const [k, v] of EMBED_CACHE.entries()) {
        if (v.at < oldestAt) {
          oldestAt = v.at;
          oldestKey = k;
        }
      }
      if (oldestKey) EMBED_CACHE.delete(oldestKey);
    }

    return vec;
  } catch (e) {
    const status = e?.httpResponse?.status;
    const detail = e?.httpResponse?.body?.error || e?.httpResponse?.body?.message || e?.message || String(e);
    setError(status ? `HF embedding failed (${status}): ${detail}` : `HF embedding failed: ${detail}`);
    return null;
  }
}

module.exports = { embedText, cosineSimilarity, hfSemanticState: state };

