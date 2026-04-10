// ================= CONFIG =================
let apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
let lastLangCode = localStorage.getItem("lastLangCode") || "";

// ================= ELEMENTS =================
const el = {
  recordBtn:      document.getElementById("recordBtn"),
  recordLabel:    document.getElementById("recordLabel"),
  waveform:       document.getElementById("waveform"),
  chatFeed:       document.getElementById("chatFeed"),
  quickPrompts:   document.getElementById("quickPrompts"),
  textInput:      document.getElementById("textInput"),
  sendBtn:        document.getElementById("sendBtn"),
  clearChat:      document.getElementById("clearChat"),
  themeToggle:    document.getElementById("themeToggle"),
  themeIcon:      document.getElementById("themeIcon"),
  settingsPanel:  document.getElementById("settingsPanel"),
  openSettings:   document.getElementById("openSettings"),
  autoScroll:     document.getElementById("autoScrollToggle"),
  waveToggle:     document.getElementById("waveToggle"),
  chatWrapper:    document.getElementById("chatWrapper"),
  chatLauncher:   document.getElementById("chatLauncher"),
  launcherIcon:   document.getElementById("launcherIcon"),
  closeChat:      document.getElementById("closeChat"),
  loader:         document.getElementById("appLoader"),
  intro:          document.getElementById("introCard"),
};

const ICON_CHAT = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M6.75 2h10.5A2.75 2.75 0 0 1 20 4.75v7.5A2.75 2.75 0 0 1 17.25 15H9.3l-3.7 3.3a1 1 0 0 1-1.67-.75V15A2.75 2.75 0 0 1 4 12.25v-7.5A2.75 2.75 0 0 1 6.75 2Zm0 2a.75.75 0 0 0-.75.75v7.5c0 .41.34.75.75.75h.68a1 1 0 0 1 1 1v1.33l2.34-2.09a1 1 0 0 1 .66-.24h7.82c.41 0 .75-.34.75-.75v-7.5a.75.75 0 0 0-.75-.75H6.75Z"/>
    <path fill="currentColor" opacity="0.85" d="M13.2 6.1l.4 1.25c.1.3.34.54.64.64l1.25.4-1.25.4c-.3.1-.54.34-.64.64l-.4 1.25-.4-1.25a.95.95 0 0 0-.64-.64l-1.25-.4 1.25-.4c.3-.1.54-.34.64-.64l.4-1.25Z"/>
  </svg>
`;

const ICON_CLOSE = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M18.3 5.71a1 1 0 0 1 0 1.41L13.41 12l4.89 4.88a1 1 0 1 1-1.41 1.42L12 13.41l-4.88 4.89a1 1 0 1 1-1.42-1.41L10.59 12 5.7 7.12A1 1 0 0 1 7.12 5.7L12 10.59l4.88-4.89a1 1 0 0 1 1.42.01Z"/>
  </svg>
`;

const ICON_MIC = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm-1-8a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0V6Z"/>
    <path fill="currentColor" opacity="0.9" d="M7 11a1 1 0 0 1 2 0 3 3 0 0 0 6 0 1 1 0 1 1 2 0 5 5 0 0 1-4 4.9V18h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.1A5 5 0 0 1 7 11Z"/>
  </svg>
`;

const ICON_STOP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M8 8.5A2.5 2.5 0 0 1 10.5 6h3A2.5 2.5 0 0 1 16 8.5v7A2.5 2.5 0 0 1 13.5 18h-3A2.5 2.5 0 0 1 8 15.5v-7Z"/>
  </svg>
`;

const ICON_SPEAK = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M5 10v4a1 1 0 0 0 1 1h3.6l3.7 3.1A1 1 0 0 0 15 17.4V6.6a1 1 0 0 0-1.7-.7L9.6 9H6a1 1 0 0 0-1 1Z"/>
    <path fill="currentColor" opacity="0.85" d="M17.2 7.6a1 1 0 0 1 1.4-.2A7.4 7.4 0 0 1 21 12a7.4 7.4 0 0 1-2.4 4.6 1 1 0 1 1-1.3-1.5A5.4 5.4 0 0 0 19 12a5.4 5.4 0 0 0-1.8-3.9 1 1 0 0 1 0-1.5Z"/>
  </svg>
`;

const ICON_TRANSLATE = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12.5 4h7a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19.5 20h-7A1.5 1.5 0 0 1 11 18.5v-13A1.5 1.5 0 0 1 12.5 4Zm0 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5h-7Z"/>
    <path fill="currentColor" opacity="0.85" d="M3.5 6H9a1 1 0 1 1 0 2H7.9a10 10 0 0 1-1.3 3.1l1.7 1.7a1 1 0 0 1-1.4 1.4l-1.5-1.5a10.4 10.4 0 0 1-1.8 1.5 1 1 0 0 1-1.1-1.7c.4-.3.8-.6 1.2-.9l-1.1-1.1A1 1 0 0 1 4 9.1l.8.8c.3-.6.5-1.3.7-1.9H3.5a1 1 0 1 1 0-2Z"/>
  </svg>
`;

// ================= STATE =================
let state = {
  recording:   false,
  recognition: null,
  mediaRecorder: null,
  mediaStream: null,
  mediaChunks: [],
  vadCtx: null,
  vadAnalyser: null,
  vadData: null,
  vadRaf: null,
  vadSpeechStarted: false,
  vadLastLoudAt: 0,
  prompts:     [],
  suggestions: null,
  liveBubble: null,
  liveTranscriptFinal: "",
  liveTranscriptInterim: "",
  lastSpeechError: null,
  micMode: "idle", // idle | recording | stopping
  micSession: 0,
  micAbortTimer: null,
  micForceTimer: null,
  hadConversationBeforeMic: false,
};

// ================= UTILS =================
function scrollToBottom() {
  if (el.autoScroll && el.autoScroll.checked) {
    el.chatFeed.scrollTop = el.chatFeed.scrollHeight;
  }
}

async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const obj = await res.json().catch(() => null);
      const msg = obj && (obj.error || obj.message) ? String(obj.error || obj.message) : JSON.stringify(obj || {});
      throw new Error(msg || "Request failed");
    }
    const err = await res.text().catch(() => res.statusText);
    throw new Error(err || "Request failed");
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setBackendStatus(ok, text) {
  const pill = document.getElementById("backendStatus");
  const dot = document.getElementById("backendStatusDot");
  const label = document.getElementById("backendStatusText");
  if (!pill || !dot || !label) return;

  pill.classList.toggle("ok", Boolean(ok));
  pill.classList.toggle("bad", ok === false);
  label.textContent = text || (ok ? "Backend: connected" : "Backend: offline");
}

// ================= MESSAGES =================
function createMessage(type, text, meta = "") {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  const actions =
    type === "bot"
      ? `
    <div class="msg-actions" aria-label="Message actions">
      <button type="button" class="icon-btn speak-btn" aria-label="Speak this message">${ICON_SPEAK}</button>
      <button type="button" class="icon-btn translate-btn hidden" aria-label="Translate to English">${ICON_TRANSLATE}</button>
    </div>
    <div class="translation hidden">
      <div class="translation-head">
        <div class="translation-title">English</div>
        <button type="button" class="icon-btn speak-translation-btn" aria-label="Speak English translation">${ICON_SPEAK}</button>
      </div>
      <div class="translation-text"></div>
    </div>
  `
      : "";

  msg.innerHTML = `
    ${meta ? `<div class="meta">${meta}</div>` : ""}
    <div class="text">${escapeHtml(text)}</div>
    ${actions}
  `;
  el.chatFeed.appendChild(msg);
  scrollToBottom();
  if (type === "bot") attachBotActions(msg, text);
  return msg;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function typingIndicator() {
  const msg = document.createElement("div");
  msg.className = "message bot typing-msg";
  msg.innerHTML = `
    <div class="meta">VoiceFlow</div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
  `;
  el.chatFeed.appendChild(msg);
  scrollToBottom();
  return msg;
}

function setMessageMeta(msgEl, metaText) {
  if (!msgEl) return;
  const meta = msgEl.querySelector(".meta");
  if (meta) meta.textContent = metaText || "";
}

function setMessageText(msgEl, text) {
  if (!msgEl) return;
  const textEl = msgEl.querySelector(".text");
  if (textEl) textEl.textContent = text ?? "";
}

// ================= SUGGESTIONS =================
function clearSuggestions() {
  if (state.suggestions) {
    state.suggestions.remove();
    state.suggestions = null;
  }
}

function showSuggestions(prompts, excludeText = "") {
  clearSuggestions();
  const exclude = String(excludeText || "").trim().toLowerCase();
  const list = (prompts || [])
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((q) => q.toLowerCase() !== exclude);
  const seen = new Set();
  const unique = list.filter((q) => {
    const k = q.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length === 0) return;

  const msg = document.createElement("div");
  msg.className = "message bot suggestions-msg";
  msg.innerHTML = `
    <div class="meta">Try asking</div>
    <div class="suggestions"></div>
  `;

  const wrap = msg.querySelector(".suggestions");
  unique.forEach((q) => {
    const chip = document.createElement("button");
    chip.className = "chip chip-suggest";
    chip.textContent = q;
    chip.onclick = () => {
      el.textInput.value = q;
      handleSend();
    };
    wrap.appendChild(chip);
  });

  el.chatFeed.appendChild(msg);
  state.suggestions = msg;
  scrollToBottom();
}

// ================= LANGUAGE DISPLAY =================
const LANGUAGE_NAMES = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu",
  ml: "Malayalam", gu: "Gujarati", mr: "Marathi", ur: "Urdu",
  ar: "Arabic", pt: "Portuguese", it: "Italian", ja: "Japanese",
  ko: "Korean", "zh-cn": "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
  id: "Indonesian", ms: "Malay", pa: "Punjabi", fa: "Persian",
  ru: "Russian", fi: "Finnish", sw: "Swahili",
};

function getLangName(code) {
  return LANGUAGE_NAMES[code] || code;
}

// ================= API CALLS =================
async function detectLanguage(text) {
  return safeFetch(`${apiBase}/detect-language`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

async function queryBot(text) {
  return safeFetch(`${apiBase}/chat/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

async function voiceChat(audioBlob) {
  const fd = new FormData();
  fd.append("audio", audioBlob, "speech.wav");
  // Do NOT force a language hint; Telugu spoken on an English browser often gets biased to English.
  // We send locale only; backend uses audio-language-ID + multi-pass Whisper selection.
  const locale = String(navigator.language || "").toLowerCase();
  fd.append("language_hint_locale", locale);
  // Helps backend pick which additional Whisper language hints are worth trying (reduces latency).
  try {
    fd.append("client_languages", JSON.stringify(navigator.languages || []));
  } catch {}
  // Keep a soft hint from the last detected language (helps after first correct detection).
  if (lastLangCode && String(lastLangCode).length === 2) fd.append("language_hint", String(lastLangCode));
  return safeFetch(`${apiBase}/voice-chat`, { method: "POST", body: fd });
}

async function translateToEnglish(text, sourceLanguageName = "") {
  return safeFetch(`${apiBase}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      target: "en",
      source_language_name: sourceLanguageName,
      source_language_code: "",
    }),
  });
}

function bcp47FromCode(code) {
  const c = String(code || "").toLowerCase();
  if (c === "en") return "en-US";
  if (c === "hi") return "hi-IN";
  if (c === "te") return "te-IN";
  if (c === "ta") return "ta-IN";
  if (c === "bn") return "bn-IN";
  if (c === "mr") return "mr-IN";
  if (c === "gu") return "gu-IN";
  if (c === "ml") return "ml-IN";
  if (c === "ur") return "ur-PK";
  return c || "en-US";
}

function speakText(text, langCode, btnEl) {
  const t = String(text || "").trim();
  if (!t || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  // Toggle: if already speaking, stop.
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }

  const u = new SpeechSynthesisUtterance(t);
  u.lang = bcp47FromCode(langCode);
  if (btnEl) btnEl.classList.add("speaking");
  u.onend = () => btnEl && btnEl.classList.remove("speaking");
  u.onerror = () => btnEl && btnEl.classList.remove("speaking");
  window.speechSynthesis.speak(u);
}

async function attachBotActions(msgEl, botText, opts = {}) {
  const speakBtn = msgEl.querySelector(".speak-btn");
  const translateBtn = msgEl.querySelector(".translate-btn");
  const translationWrap = msgEl.querySelector(".translation");
  const translationText = msgEl.querySelector(".translation-text");
  const speakTranslationBtn = msgEl.querySelector(".speak-translation-btn");

  msgEl.dataset.botText = String(botText || "");
  if (opts.answerEn) msgEl.dataset.answerEn = String(opts.answerEn || "");
  if (opts.langCode) msgEl.dataset.langCode = String(opts.langCode || "");
  if (opts.langName) msgEl.dataset.langName = String(opts.langName || "");

  if (speakBtn) {
    speakBtn.onclick = () => speakText(msgEl.dataset.botText || "", msgEl.dataset.langCode || "en", speakBtn);
  }

  if (speakTranslationBtn) {
    speakTranslationBtn.onclick = () => speakText(msgEl.dataset.translationText || "", "en", speakTranslationBtn);
  }

  // If backend provides language, trust it (more accurate than re-detecting the bot text).
  let code = String(msgEl.dataset.langCode || "").toLowerCase().trim();
  if (!code) {
    try {
      const det = await detectLanguage(String(botText || ""));
      code = String(det?.language_code || "").toLowerCase().trim();
      const name = String(det?.language_name || "").trim();
      if (code) msgEl.dataset.langCode = code;
      if (name) msgEl.dataset.langName = name;
    } catch {
      // ignore
    }
  }
  if (translateBtn && code && code !== "en") translateBtn.classList.remove("hidden");

  if (translateBtn) {
    translateBtn.onclick = async () => {
      const has = Boolean(msgEl.dataset.translationText);
      if (has) {
        translationWrap?.classList.toggle("hidden");
        return;
      }

      const answerEn = String(msgEl.dataset.answerEn || "").trim();
      if (answerEn) {
        msgEl.dataset.translationText = answerEn;
        if (translationText) translationText.textContent = answerEn;
        if (translationWrap) translationWrap.classList.remove("hidden");
        return;
      }

      translateBtn.disabled = true;
      translateBtn.classList.add("busy");
      try {
        const out = await safeFetch(`${apiBase}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: msgEl.dataset.botText || "",
            target: "en",
            source_language_name: msgEl.dataset.langName || "",
            source_language_code: msgEl.dataset.langCode || "",
          }),
        });
        const tr = String(out?.translated_text || "").trim();
        msgEl.dataset.translationText = tr;
        if (translationText) translationText.textContent = tr || "(No translation)";
        if (translationWrap) translationWrap.classList.remove("hidden");
      } catch (e) {
        const raw = String(e?.message || "").trim();
        const detail = raw && raw.length < 180 ? raw : "English translation is unavailable right now.";
        createMessage("bot", `⚠️ ${detail}`, "VoiceFlow");
      } finally {
        translateBtn.disabled = false;
        translateBtn.classList.remove("busy");
      }
    };
  }
}

// ================= CORE FLOW =================
async function processMessage(text, existingUserMsg = null) {
  text = text.trim();
  if (!text) return;

  // Hide intro once user interacts
  if (el.intro) el.intro.style.display = "none";
  if (el.quickPrompts) el.quickPrompts.classList.add("hidden");
  clearSuggestions();

  const userMsg = existingUserMsg || createMessage("user", text, "You · …");
  if (existingUserMsg) {
    setMessageText(userMsg, text);
  }
  const typing = typingIndicator();
  const typingStart = performance.now();
  const MIN_TYPING_MS = 450;

  try {
    const data = await queryBot(text);

    // Ensure the typing indicator is visible for a short time (UX)
    const elapsed = performance.now() - typingStart;
    if (elapsed < MIN_TYPING_MS) await sleep(MIN_TYPING_MS - elapsed);

    typing.remove();

    const langLabel = data.language_name || getLangName(data.language_code) || "Unknown";
    setMessageMeta(userMsg, `You · ${langLabel}`);
    if (data.user_text && data.user_text.trim() && data.user_text.trim() !== text) {
      setMessageText(userMsg, data.user_text);
    }

    // Bot response
    const botText = data.bot_response && data.bot_response.toLowerCase() !== "data not present."
      ? data.bot_response
      : data.bot_response || "Sorry, I don't have that information yet.";

    const botMsg = createMessage("bot", botText, "VoiceFlow");
    if (botMsg) {
      attachBotActions(botMsg, botText, {
        langCode: data.language_code || "en",
        langName: data.language_name || "",
        answerEn: data.answer_en || "",
      });
    }
    if (data.language_code && String(data.language_code).length === 2) {
      lastLangCode = String(data.language_code).toLowerCase();
      localStorage.setItem("lastLangCode", lastLangCode);
    }
    showSuggestions(state.prompts, text);

  } catch (err) {
    const elapsed = performance.now() - typingStart;
    if (elapsed < MIN_TYPING_MS) await sleep(MIN_TYPING_MS - elapsed);
    typing.remove();
    console.error("processMessage error:", err);
    setMessageMeta(userMsg, "You · Unknown");

    // Show a helpful error rather than crashing silently
    const msg = err.message.includes("Failed to fetch")
      ? "⚠️ Cannot reach the server. Make sure it's running on " + apiBase
      : "⚠️ " + (err.message || "Something went wrong.");

    createMessage("bot", msg, "VoiceFlow");
    showSuggestions(state.prompts, text);
  }
}

// ================= TEXT INPUT =================
function handleSend() {
  const text = el.textInput.value.trim();
  if (!text) return;
  el.textInput.value = "";
  processMessage(text);
}

// ================= VOICE =================
function hideLandingPrompts() {
  if (el.intro) el.intro.style.display = "none";
  if (el.quickPrompts) el.quickPrompts.classList.add("hidden");
  clearSuggestions();
}

function restoreLandingPromptsIfNewChat() {
  if (!el.chatFeed) return;
  if (el.chatFeed.children.length !== 0) return;
  if (el.intro) el.intro.style.display = "";
  if (el.quickPrompts) el.quickPrompts.classList.remove("hidden");
}

function setListeningUi(listening) {
  const on = Boolean(listening);
  const stopping = state.micMode === "stopping";
  el.recordBtn.classList.toggle("recording", on);
  el.recordBtn.classList.toggle("stopping", stopping);
  el.recordBtn.disabled = stopping;
  setMicVisual(on);

  const showWave = on && !stopping && Boolean(el.waveToggle?.checked);
  el.waveform.classList.toggle("hidden", !showWave);
  el.waveform.classList.toggle("active", showWave);

  el.textInput.placeholder = on ? "Listening…" : "Type a message…";
}

function renderLiveBubble(text) {
  const t = String(text || "").trim();
  if (!t) return;

  if (!state.liveBubble) {
    state.liveBubble = createMessage("user", t, "Listening…");
    state.liveBubble.classList.add("live");
  } else {
    setMessageText(state.liveBubble, t);
  }
}

function clearMicTimers() {
  if (state.micAbortTimer) clearTimeout(state.micAbortTimer);
  if (state.micForceTimer) clearTimeout(state.micForceTimer);
  state.micAbortTimer = null;
  state.micForceTimer = null;
}

function stopVad() {
  if (state.vadRaf) cancelAnimationFrame(state.vadRaf);
  state.vadRaf = null;
  state.vadAnalyser = null;
  state.vadData = null;
  state.vadSpeechStarted = false;
  state.vadLastLoudAt = 0;
  if (state.vadCtx) {
    try { state.vadCtx.close(); } catch {}
  }
  state.vadCtx = null;
}

function cancelRecording() {
  // Invalidate any pending SpeechRecognition callbacks
  state.micSession += 1;
  clearMicTimers();
  stopVad();

  try { state.recognition?.abort(); } catch {}
  try { state.recognition?.stop(); } catch {}
  try { state.mediaRecorder?.stop(); } catch {}
  try { state.mediaStream?.getTracks?.().forEach((t) => t.stop()); } catch {}

  state.micMode = "idle";
  state.recording = false;
  state.recognition = null;
  state.mediaRecorder = null;
  state.mediaStream = null;
  state.mediaChunks = [];
  state.liveTranscriptFinal = "";
  state.liveTranscriptInterim = "";
  state.lastSpeechError = null;

  if (state.liveBubble) {
    try { state.liveBubble.remove(); } catch {}
    state.liveBubble = null;
  }

  setListeningUi(false);
}

function finishRecording(session, { send = true } = {}) {
  if (session !== state.micSession) return;

  const err = state.lastSpeechError;
  const wasNewChat = !state.hadConversationBeforeMic;
  const chunks = state.mediaChunks.slice();
  const bubble = state.liveBubble;

  state.micMode = "idle";
  state.recording = false;
  state.recognition = null;
  state.mediaRecorder = null;
  state.mediaStream = null;
  state.mediaChunks = [];
  stopVad();
  state.liveTranscriptFinal = "";
  state.liveTranscriptInterim = "";
  state.lastSpeechError = null;
  state.hadConversationBeforeMic = false;
  clearMicTimers();
  setListeningUi(false);

  state.liveBubble = null;

  if (send && chunks.length) {
    if (bubble) {
      bubble.classList.remove("live");
      setMessageMeta(bubble, "You · Voice");
      const locale = String(navigator.language || "").toLowerCase();
      setMessageText(bubble, locale.startsWith("en") ? "Processing…" : "Transcribing…");
    }

    (async () => {
      const typing = typingIndicator();
      const typingStart = performance.now();
      const locale = String(navigator.language || "").toLowerCase();
      const MIN_TYPING_MS = locale.startsWith("en") ? 180 : 450;
      try {
        const rawBlob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        const wav16k = await resampleBlobTo16kWav(rawBlob);
        const data = await voiceChat(wav16k);

        const elapsed = performance.now() - typingStart;
        if (elapsed < MIN_TYPING_MS) await sleep(MIN_TYPING_MS - elapsed);
        typing.remove();

        const spoken = String(data?.transcribed_text || "").trim();
        const langLabel = data?.language_name || getLangName(data?.language_code) || "Unknown";
        if (bubble) {
          setMessageMeta(bubble, `You · ${langLabel}`);
          setMessageText(bubble, spoken || "(No speech detected)");
        }

        const botText = String(data?.bot_response || "Sorry, I couldn't process that voice message.").trim();
        const botMsg = createMessage("bot", botText, "VoiceFlow");
        if (botMsg) {
          attachBotActions(botMsg, botText, {
            langCode: data?.language_code || "en",
            langName: data?.language_name || "",
            answerEn: data?.answer_en || "",
          });
        }
        if (data?.language_code && String(data.language_code).length === 2) {
          lastLangCode = String(data.language_code).toLowerCase();
          localStorage.setItem("lastLangCode", lastLangCode);
        }
        showSuggestions(state.prompts, spoken || "");
      } catch (e) {
        const elapsed = performance.now() - typingStart;
        if (elapsed < MIN_TYPING_MS) await sleep(MIN_TYPING_MS - elapsed);
        typing.remove();
        console.error("voice-chat error:", e);

        if (bubble) {
          setMessageMeta(bubble, "You · Voice");
          setMessageText(bubble, "(Voice message)");
        }
        createMessage("bot", "⚠️ Voice transcription failed. Check backend status and try again.", "VoiceFlow");
        showSuggestions(state.prompts, "");
      }
    })();
    return;
  }

  if (bubble) {
    try { bubble.remove(); } catch {}
  }

  if (wasNewChat) {
    restoreLandingPromptsIfNewChat();
  }

  if (err === "not-allowed") {
    createMessage("bot", "Microphone access is blocked. Allow mic permission in the browser and try again.", "VoiceFlow");
  } else if (err === "recording-failed") {
    createMessage("bot", "Voice recording failed. Please try again.", "VoiceFlow");
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWavFromAudioBuffer(audioBuffer, targetSampleRate) {
  const sampleRate = targetSampleRate || audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length;

  // Mixdown to mono (smaller, consistent for Whisper).
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numChannels;
  }

  const buffer = new ArrayBuffer(44 + mono.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + mono.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, mono.length * 2, true);
  floatTo16BitPCM(view, 44, mono);

  return new Blob([buffer], { type: "audio/wav" });
}

async function resampleBlobTo16kWav(blob) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext not supported");

  const ab = await blob.arrayBuffer();
  const ctx = new AudioCtx();
  try {
    const decoded = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(ab, resolve, reject);
    });

    const targetRate = 16000;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, length, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return encodeWavFromAudioBuffer(rendered, targetRate);
  } finally {
    try { await ctx.close(); } catch {}
  }
}

async function startRecording() {
  if (state.micMode !== "idle") return;

  // If the user starts with mic, hide default chips so the UI stays clean.
  state.hadConversationBeforeMic = Boolean(el.chatFeed?.children?.length);
  hideLandingPrompts();

  state.micSession += 1;
  const session = state.micSession;
  clearMicTimers();

  state.mediaChunks = [];
  state.recording = true;
  state.micMode = "recording";
  state.liveTranscriptFinal = "";
  state.liveTranscriptInterim = "";
  state.lastSpeechError = null;

  setListeningUi(true);
  el.textInput.focus();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (session !== state.micSession) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    state.mediaStream = stream;

    // Voice Activity Detection (silence auto-stop)
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      state.vadCtx = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      state.vadAnalyser = analyser;
      state.vadData = new Float32Array(analyser.fftSize);
      state.vadSpeechStarted = false;
      state.vadLastLoudAt = performance.now();

      const SILENCE_MS = 900;
      const START_GRACE_MS = 500;
      const THRESH = 0.02; // tweak if needed

      const startAt = performance.now();

      const tick = () => {
        if (session !== state.micSession) return;
        if (state.micMode !== "recording") return;
        if (!state.vadAnalyser || !state.vadData) return;

        state.vadAnalyser.getFloatTimeDomainData(state.vadData);
        let sum = 0;
        for (let i = 0; i < state.vadData.length; i++) {
          const v = state.vadData[i];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / state.vadData.length);
        const now = performance.now();
        const loud = rms >= THRESH;

        if (loud) {
          state.vadSpeechStarted = true;
          state.vadLastLoudAt = now;
        }

        const canAutoStop = state.vadSpeechStarted && (now - state.vadLastLoudAt) >= SILENCE_MS && (now - startAt) >= START_GRACE_MS;

        if (canAutoStop) {
          stopRecording();
          return;
        }
        state.vadRaf = requestAnimationFrame(tick);
      };

      state.vadRaf = requestAnimationFrame(tick);
    }

    const preferred = "audio/webm;codecs=opus";
    const mimeType = window.MediaRecorder && MediaRecorder.isTypeSupported(preferred) ? preferred : "";
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.mediaRecorder = mr;

    renderLiveBubble("Recording voice…");

    mr.ondataavailable = (e) => {
      if (session !== state.micSession) return;
      if (e.data && e.data.size) state.mediaChunks.push(e.data);
    };
    mr.onerror = () => {
      if (session !== state.micSession) return;
      state.lastSpeechError = "recording-failed";
      finishRecording(session, { send: false });
    };
    mr.onstop = () => {
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}
      finishRecording(session, { send: true });
    };

    mr.start();
  } catch (e) {
    state.lastSpeechError = "not-allowed";
    finishRecording(session, { send: false });
    createMessage("bot", "Could not start microphone. Allow mic permission in the browser and try again.", "VoiceFlow");
    return;
  }

  // Safety stop.
  state.micForceTimer = setTimeout(() => {
    if (state.micMode === "recording" && session === state.micSession) {
      stopRecording();
    }
  }, 12000);
}

function stopRecording() {
  if (state.micMode !== "recording") return;
  state.micMode = "stopping";
  setListeningUi(true);

  const mr = state.mediaRecorder;
  try { mr?.stop(); } catch {}

  // If stop() doesn't end quickly, force cleanup.
  const session = state.micSession;
  state.micAbortTimer = setTimeout(() => {
    if (state.micMode === "stopping" && session === state.micSession) {
      cancelRecording();
    }
  }, 900);

  // If the browser never fires onend, force cleanup.
  state.micForceTimer = setTimeout(() => {
    if (session === state.micSession && state.micMode !== "idle") {
      finishRecording(session, { send: true });
    }
  }, 2500);
}

function setMicVisual(recording) {
  const icon = el.recordBtn?.querySelector(".mic-icon");
  if (icon) icon.innerHTML = recording ? ICON_STOP : ICON_MIC;
  if (el.recordLabel) el.recordLabel.textContent = recording ? "Listening…" : "Tap to Speak";
}

// ================= CHAT TOGGLE =================
function setLauncherOpen(open) {
  if (!el.chatLauncher) return;
  el.chatLauncher.classList.toggle("open", open);
  el.chatLauncher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
  if (el.launcherIcon) el.launcherIcon.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
}

function toggleChat() {
  const willOpen = el.chatWrapper.classList.contains("hidden");
  el.chatWrapper.classList.toggle("hidden");
  setLauncherOpen(willOpen);
  if (willOpen) {
    el.textInput.focus();
  }
}

// ================= THEME =================
function applyTheme(dark) {
  document.body.classList.toggle("theme-dark", dark);
  el.themeIcon.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("theme", dark ? "dark" : "light");
}

function initTheme() {
  const dark = localStorage.getItem("theme") === "dark";
  el.themeToggle.checked = dark;
  applyTheme(dark);
}

// ================= QUICK PROMPTS =================
const FALLBACK_PROMPTS = [
  "What information can you give?",
  "What kind of deliveries do you provide?",
  "What items are available?",
  "Do you deliver in 10 minutes?",
  "What are your delivery hours?",
  "How to track my order?",
  "What payment methods are accepted?",
];

function renderPrompts(prompts) {
  if (!el.quickPrompts) return;
  el.quickPrompts.innerHTML = "";
  const seen = new Set();
  (prompts || []).forEach((q) => {
    const text = String(q || "").trim();
    if (!text) return;
    const k = text.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = text;
    chip.onclick = () => {
      el.textInput.value = text;
      handleSend();
    };
    el.quickPrompts.appendChild(chip);
  });
}

async function loadPrompts() {
  // Always show something even if backend is down
  state.prompts = FALLBACK_PROMPTS.slice();
  renderPrompts(state.prompts);
  try {
    const data = await safeFetch(`${apiBase}/quick-questions`);
    state.prompts = (data.questions && data.questions.length ? data.questions : FALLBACK_PROMPTS).slice();
    renderPrompts(state.prompts);
  } catch {
    // Keep fallback prompts
  }
}

async function checkBackend() {
  try {
    await safeFetch(`${apiBase}/status`).catch(() => safeFetch(`${apiBase}/`));
    setBackendStatus(true, "Backend: connected");
  } catch {
    setBackendStatus(false, "Backend: offline");
  }
}

// ================= EVENT LISTENERS =================
el.sendBtn.onclick = handleSend;
el.textInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

el.recordBtn.onclick = () => (state.micMode === "idle" ? startRecording() : stopRecording());
el.waveToggle.onchange = () => {
  if (state.micMode !== "idle") setListeningUi(true);
};

el.chatLauncher.onclick = toggleChat;
el.closeChat.onclick    = toggleChat;

el.clearChat.onclick = () => {
  cancelRecording();
  if (el.settingsPanel) el.settingsPanel.classList.add("hidden");
  el.textInput.value = "";
  el.textInput.placeholder = "Type a message…";
  el.waveform.classList.add("hidden");
  el.waveform.classList.remove("active");
  el.chatFeed.innerHTML = "";
  clearSuggestions();
  if (el.intro) el.intro.style.display = "";
  if (el.quickPrompts) el.quickPrompts.classList.remove("hidden");
  loadPrompts();
  el.chatFeed.scrollTop = 0;
};

el.openSettings.onclick = () => el.settingsPanel.classList.toggle("hidden");

el.themeToggle.onchange = () => applyTheme(el.themeToggle.checked);

// ================= BOOT =================
function boot() {
  initTheme();
  loadPrompts();
  setLauncherOpen(false);
  setMicVisual(false);
  checkBackend();
  // Hide loader
  setTimeout(() => el.loader?.classList.add("hide"), 400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
