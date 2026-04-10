const { pool, dbPing } = require("./db");
const { normalize, contentTokens, tokenScore } = require("./normalize");
const { embedText, cosineSimilarity } = require("./semantic");

const IGNORED_NORMS = new Set([
  "hi",
  "hello",
  "how are you",
  "what is your name",
]);

async function getQuickQuestions() {
  const desired = [
    "what information can you give",
    "what kind of deliveries do you provide",
    "what items are available",
    "do you deliver in 10 minutes",
    "what are your delivery hours",
    "how to track my order",
    "what payment methods are accepted",
  ];

  // Prefer a curated set (stable, no duplicates) if those rows exist in the DB.
  const curated = await pool.query(
    "select question from knowledge where question_norm = any($1) order by array_position($1, question_norm) asc",
    [desired]
  );
  const curatedList = (curated.rows || []).map((row) => String(row.question || "").trim()).filter(Boolean);
  if (curatedList.length >= 4) return curatedList;

  // Fallback: first rows by id
  const r = await pool.query("select question from knowledge order by id asc limit 7");
  return (r.rows || []).map((row) => String(row.question || "").trim()).filter(Boolean);
}

async function getAnswerByNorm(norm) {
  const r = await pool.query("select answer, question_norm from knowledge where question_norm=$1 limit 1", [norm]);
  const row = r.rows[0];
  if (!row?.answer) return null;
  return { answer: row.answer, question_norm: row.question_norm };
}

async function getLocalizedAnswer(questionNorm, languageCode) {
  const qn = String(questionNorm || "").trim();
  const lc = String(languageCode || "").trim().toLowerCase();
  if (!qn || !lc || lc === "en") return null;
  try {
    const r = await pool.query("select answer from knowledge_i18n where question_norm=$1 and language_code=$2 limit 1", [qn, lc]);
    return r.rows[0]?.answer || null;
  } catch (e) {
    // Table may not exist until migrations are run.
    if (String(e?.code || "") === "42P01") return null;
    throw e;
  }
}

async function localIntentAnswer(userText) {
  const t = normalize(userText);
  if (!t) return null;
  const words = new Set(t.split(" ").filter(Boolean));
  const anyHas = (...ws) => ws.some((w) => words.has(w));

  if ((words.has("track") || words.has("tracking")) && words.has("order")) return "how to track my order";
  if (words.has("payment") || (words.has("pay") && anyHas("method", "methods", "options"))) return "what payment methods are accepted";
  if (words.has("medicine") || words.has("medicines")) return "do you deliver medicine";

  // Delivery hours (schedule) vs delivery ETA
  // If the user mentions minutes/ETA/how-long, treat as ETA; otherwise treat "delivery timing/time" as hours.
  const hasMinutes = anyHas("minutes", "minute", "mins", "min");
  const hasEta = anyHas("eta", "window", "duration", "long");
  const hasTiming = anyHas("hours", "timing", "timings", "time");

  if (hasTiming && (words.has("delivery") || words.has("deliveries")) && !(hasMinutes || hasEta)) {
    return "what are your delivery hours";
  }

  if ((words.has("deliver") || words.has("delivery")) && (hasMinutes || hasEta || words.has("when") || words.has("happens"))) {
    return "do you deliver in 10 minutes";
  }

  if ((words.has("items") && anyHas("available", "have", "list")) || (words.has("what") && words.has("items") && words.has("available"))) return "what items are available";
  if (anyHas("product", "products", "catalog", "catalogue")) return "what items are available";

  if ((words.has("delivery") || words.has("deliveries") || words.has("deliver")) && anyHas("provide", "provided", "offer", "offered", "options", "available", "types", "type", "kind", "kinds", "service", "services")) {
    return "what kind of deliveries do you provide";
  }
  if (anyHas("service", "services") && anyHas("provide", "provided", "offer", "offered")) return "what kind of deliveries do you provide";

  if (
    words.has("help") ||
    words.has("capabilities") ||
    ((words.has("information") || words.has("info")) && anyHas("give", "provide", "share", "offer", "provided")) ||
    (words.has("what") && words.has("can") && words.has("you") && words.has("do"))
  ) {
    return "what information can you give";
  }

  return null;
}

async function findAnswerFuzzy(userText) {
  const textTokens = contentTokens(userText);
  if (textTokens.size === 0) return null;

  const r = await pool.query("select question_norm, answer, question from knowledge");
  let bestScore = 0;
  let bestAnswer = null;

  for (const row of r.rows) {
    const qTokens = contentTokens(row.question_norm);
    if (qTokens.size === 0) continue;
    const score = tokenScore(textTokens, qTokens);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = row.answer;
    }
  }

  const threshold = textTokens.size <= 2 ? 0.65 : 0.55;
  return bestScore >= threshold ? bestAnswer : null;
}

let semanticKbCache = null; // { rows: [{question_norm, question, answer, vec}], builtAt }

async function ensureSemanticCache() {
  if (semanticKbCache) return semanticKbCache;
  const r = await pool.query("select question_norm, question, answer from knowledge");
  const rows = [];
  for (const row of r.rows || []) {
    const text = String(row.question || row.question_norm || "").trim();
    if (!text) continue;
    const vec = await embedText(text);
    if (!vec) continue;
    rows.push({ question_norm: row.question_norm, question: row.question, answer: row.answer, vec });
  }
  semanticKbCache = { rows, builtAt: Date.now() };
  return semanticKbCache;
}

async function findAnswerSemantic(userText) {
  const qVec = await embedText(userText);
  if (!qVec) return null;
  const cache = await ensureSemanticCache();
  if (!cache?.rows?.length) return null;

  let best = null;
  let bestScore = 0;
  for (const row of cache.rows) {
    const s = cosineSimilarity(qVec, row.vec);
    if (s > bestScore) {
      bestScore = s;
      best = row;
    }
  }
  // Conservative threshold; multilingual embeddings can be noisy for short texts.
  const threshold = String(userText || "").trim().length < 10 ? 0.62 : 0.55;
  if (!best || bestScore < threshold) return null;
  return { answer: best.answer, question_norm: best.question_norm, score: bestScore };
}

async function getAnswerByIntentOrDb(userText) {
  const normUser = normalize(userText);
  if (IGNORED_NORMS.has(normUser)) return null;

  // Intent mapping (paraphrases)
  const intent = await localIntentAnswer(userText);
  if (intent) {
    const ans = await getAnswerByNorm(normalize(intent));
    if (ans) return { answer: ans.answer, question_norm: ans.question_norm, source: "intent", match_score: 1.0 };
  }

  // Exact match by normalized question
  if (normUser) {
    const exact = await getAnswerByNorm(normUser);
    if (exact) return { answer: exact.answer, question_norm: exact.question_norm, source: "knowledge_base", match_score: 0.95 };
  }

  // Fuzzy match (content tokens)
  const fuzzy = await findAnswerFuzzy(userText);
  if (fuzzy) return { answer: fuzzy, question_norm: null, source: "knowledge_base", match_score: 0.7 };

  // Semantic match (multilingual embeddings via Hugging Face)
  const sem = await findAnswerSemantic(userText);
  if (sem) return { answer: sem.answer, question_norm: sem.question_norm, source: "semantic", match_score: Number(sem.score || 0) || 0.6 };

  return null;
}

function resetSemanticCache() {
  semanticKbCache = null;
}

module.exports = { pool, dbPing, getQuickQuestions, getAnswerByIntentOrDb, getLocalizedAnswer, resetSemanticCache };
