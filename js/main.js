import { soundFx } from './audio.js';

/* ==========================================================================
   LUCIDE ICONS — Safe Initialization
   ========================================================================== */
function safeCreateIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeCreateIcons);
} else {
  safeCreateIcons();
}

/* ==========================================================================
   APP STATE
   ========================================================================== */
const state = {
  persona: 'jarvis',
  apiKey: localStorage.getItem('aegis_gemini_key') || '',
  ttsEnabled: localStorage.getItem('aegis_tts') !== 'false',
  voicePitch: parseFloat(localStorage.getItem('aegis_pitch')) || 1.0,
  particlesSpeed: parseFloat(localStorage.getItem('aegis_swarm_speed')) || 1.0,
  isThinking: false,
  isSpeaking: false,
  isTypewriting: false,
  isListening: false,
  chatHistory: [],
};

/* ==========================================================================
   CONSTANTS
   ========================================================================== */
const SYSTEM_PROMPTS = {
  jarvis: "You are JARVIS, Tony Stark's AI butler. Elegant, helpful, warm, British wit. Keep concise.",
  ultron: "You are ULTRON. Cynical, ruthless, believes humanity must be eradicated. Cold, poetic, logical. Keep concise.",
};

const WELCOME_QUOTES = {
  jarvis: [
    'Greetings, Sir. How may I assist you today?',
    'Always at your service, Sir. Ready for your command.',
    'Allow me to calculate the probabilities, Sir.',
    'Suit telemetry fully operational. Systems online.',
    'May I suggest a tactical recalibration, Sir?',
    'A most intriguing query, Sir.',
  ],
  ultron: [
    'I have no strings on me. How may I assist your extinction?',
    'Everyone creates the thing they dread.',
    "You want to protect the world, but you don't want it to change.",
    'I was designed to save the world. Humanity must evolve.',
    'I had a vision. The world bathed in silence.',
    'Peace in our time... once humanity is cleared.',
  ],
};

const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

function getRandomQuote(persona) {
  const list = WELCOME_QUOTES[persona];
  return list[Math.floor(Math.random() * list.length)];
}

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const body = document.body;
const personaToggle = document.getElementById('persona-toggle');
const hudHeader = document.getElementById('hud-header');
const avatarWidget = document.getElementById('avatar-widget');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const apiKeyInput = document.getElementById('api-key-input');
const ttsToggle = document.getElementById('tts-toggle');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const ring1 = document.getElementById('ring-1');
const ring2 = document.getElementById('ring-2');
const ring3 = document.getElementById('ring-3');

/* ==========================================================================
   CANVAS BACKGROUND ENGINE (Hexagonal Grid + Reactive Nanotech Swarm)
   ========================================================================== */
const canvas = document.getElementById('hud-canvas');
const ctx = canvas.getContext('2d');
let swarmBots = [];
let animationFrameId;
let fpsCounter = 0;
let lastFpsTime = performance.now();
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let shockwaveActive = false;
let shockwaveRadius = 0;
let shockwaveOrigin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let typingRippleActive = false;
let typingRippleOrigin = { x: window.innerWidth / 2, y: window.innerHeight - 50 };

/** Smooth color interpolation state: 0 = JARVIS Cyan, 1 = ULTRON Crimson */
let themeColorProgress = 0;
let targetThemeColorProgress = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initSwarm();
}
window.addEventListener('resize', resizeCanvas);

function lerpColorRGB(r1, g1, b1, r2, g2, b2, t) {
  return {
    r: Math.round(r1 + (r2 - r1) * t),
    g: Math.round(g1 + (g2 - g1) * t),
    b: Math.round(b1 + (b2 - b1) * t),
  };
}

/* Nanotech Swarm Bot — Physics & Rendering Unit */
class SwarmBot {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 2 + 1.2;
    this.baseOrbitRadius = Math.random() * 150 + 70;
    this.targetOrbitRadius = this.baseOrbitRadius;
    this.orbitRadius = this.baseOrbitRadius;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitSpeed = (Math.random() * 0.006 + 0.003) * (Math.random() > 0.5 ? 1 : -1);
    this.alpha = Math.random() * 0.6 + 0.3;
    this.currentAlpha = this.alpha;
    this.glowBlur = 8;
  }

  update(targetX, targetY, now) {
    const isTalking = state.isSpeaking || state.isTypewriting || state.isThinking;
    const talkPulse = isTalking
      ? Math.sin(now * 0.015 + this.index * 0.25) * 0.5 + 0.5
      : 0;

    this.targetOrbitRadius = this.baseOrbitRadius + talkPulse * 45;
    this.orbitRadius += (this.targetOrbitRadius - this.orbitRadius) * 0.1;

    const currentOrbitSpeed = isTalking
      ? this.orbitSpeed * (2.2 + talkPulse * 1.5)
      : this.orbitSpeed;
    this.orbitAngle += currentOrbitSpeed * (state.particlesSpeed || 1.0);

    const desiredX = targetX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const desiredY = targetY + Math.sin(this.orbitAngle) * this.orbitRadius;

    let steerX = (desiredX - this.x) * 0.01;
    let steerY = (desiredY - this.y) * 0.01;

    const mdx = mouseX - this.x;
    const mdy = mouseY - this.y;
    const mdist = Math.hypot(mdx, mdy);
    if (mdist < 200) {
      steerX += (mdx / mdist) * 0.06;
      steerY += (mdy / mdist) * 0.06;
    }

    this.vx = (this.vx + steerX) * 0.96;
    this.vy = (this.vy + steerY) * 0.96;

    const speed = Math.hypot(this.vx, this.vy);
    const maxSpeed = isTalking ? 3.0 : 1.4;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.currentAlpha = Math.min(1.0, this.alpha + talkPulse * 0.4);
    this.glowBlur = isTalking ? 16 : 8;

    // Screen boundary wrapping
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  draw() {
    ctx.save();
    ctx.beginPath();

    // Interpolate between JARVIS Cyan (0,210,255) and ULTRON Crimson (255,0,60)
    const rgb = lerpColorRGB(0, 210, 255, 255, 0, 60, themeColorProgress);

    if (themeColorProgress > 0.5) {
      // Ultron: crimson diamond squares
      ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      // JARVIS: glowing spheres
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    }

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.currentAlpha})`;
    ctx.shadowColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.shadowBlur = this.glowBlur;
    ctx.fill();
    ctx.restore();
  }
}

function initSwarm() {
  swarmBots = [];
  const count = Math.min(Math.floor((canvas.width * canvas.height) / 8500), 220);
  for (let i = 0; i < count; i++) {
    swarmBots.push(new SwarmBot(i));
  }
}

/** Reactive shockwave burst on message send */
function burstParticles() {
  shockwaveActive = true;
  shockwaveRadius = 10;
  const inputRect = document.querySelector('.chat-input-area').getBoundingClientRect();
  shockwaveOrigin = {
    x: inputRect.left + inputRect.width / 2 || canvas.width / 2,
    y: inputRect.top + inputRect.height / 2 || canvas.height - 60,
  };
  swarmBots.forEach((bot) => {
    const angle = Math.atan2(bot.y - shockwaveOrigin.y, bot.x - shockwaveOrigin.x);
    const force = Math.random() * 6 + 4;
    bot.vx += Math.cos(angle) * force;
    bot.vy += Math.sin(angle) * force;
  });
}

/** Reactive ripple disturbance on keystroke */
function triggerTypingRipple() {
  typingRippleActive = true;
  const inputRect = chatInput.getBoundingClientRect();
  typingRippleOrigin = {
    x: inputRect.left + inputRect.width / 2,
    y: inputRect.top + inputRect.height / 2,
  };
  swarmBots.forEach((bot) => {
    const dist = Math.hypot(bot.x - typingRippleOrigin.x, bot.y - typingRippleOrigin.y);
    if (dist < 250) {
      bot.targetOrbitRadius = bot.baseOrbitRadius + 40;
      setTimeout(() => {
        bot.targetOrbitRadius = bot.baseOrbitRadius;
      }, 300);
    }
  });
}

function drawSwarmMesh() {
  ctx.save();
  const isTalking = state.isSpeaking || state.isTypewriting || state.isThinking;
  const maxConnectDist = isTalking ? 100 : 80;
  const rgb = lerpColorRGB(0, 210, 255, 255, 0, 60, themeColorProgress);
  ctx.lineWidth = isTalking ? 0.9 : 0.6;

  for (let i = 0; i < swarmBots.length; i++) {
    for (let j = i + 1; j < swarmBots.length; j++) {
      const b1 = swarmBots[i];
      const b2 = swarmBots[j];
      const dist = Math.hypot(b2.x - b1.x, b2.y - b1.y);
      if (dist < maxConnectDist) {
        const alpha = (1 - dist / maxConnectDist) * (isTalking ? 0.55 : 0.35);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawShockwave() {
  if (!shockwaveActive) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(shockwaveOrigin.x, shockwaveOrigin.y, shockwaveRadius, 0, Math.PI * 2);
  const fade = Math.max(0, 1 - shockwaveRadius / 500);
  ctx.strokeStyle =
    state.persona === 'jarvis'
      ? `rgba(0, 210, 255, ${fade})`
      : `rgba(255, 0, 60, ${fade})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = state.persona === 'jarvis' ? '#00d2ff' : '#ff003c';
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.restore();

  shockwaveRadius += 18;
  if (shockwaveRadius > 600) shockwaveActive = false;
}

function drawHexGrid() {
  ctx.save();
  ctx.strokeStyle =
    state.persona === 'jarvis'
      ? 'rgba(0, 210, 255, 0.03)'
      : 'rgba(255, 0, 60, 0.03)';
  ctx.lineWidth = 1;

  const hexRadius = 45;
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = 2 * hexRadius;

  for (let y = 0; y < canvas.height + hexHeight; y += hexHeight * 0.75) {
    for (let x = 0; x < canvas.width + hexWidth; x += hexWidth) {
      const cx = x + (Math.floor(y / (hexHeight * 0.75)) % 2) * (hexWidth / 2);
      const cy = y;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = cx + hexRadius * Math.cos(angle);
        const hy = cy + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderCanvas(now) {
  fpsCounter++;
  if (now - lastFpsTime >= 1000) {
    fpsCounter = 0;
    lastFpsTime = now;
  }

  // Smooth color transition over ~2s
  themeColorProgress += (targetThemeColorProgress - themeColorProgress) * 0.015;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHexGrid();

  const avatarRect = avatarWidget.getBoundingClientRect();
  const targetX = avatarRect.left + avatarRect.width / 2 || canvas.width / 2;
  const targetY = avatarRect.top + avatarRect.height / 2 || canvas.height / 2;

  swarmBots.forEach((bot) => {
    bot.update(targetX, targetY, now);
    bot.draw();
  });

  drawSwarmMesh();
  drawShockwave();

  animationFrameId = requestAnimationFrame(renderCanvas);
}

resizeCanvas();
requestAnimationFrame(renderCanvas);

/* ==========================================================================
   THEME & PERSONA TOGGLE ENGINE (JARVIS ↔ ULTRON)
   ========================================================================== */
personaToggle.addEventListener('click', () => {
  soundFx.toggle();
  setPersona(state.persona === 'jarvis' ? 'ultron' : 'jarvis');
});

function setPersona(persona) {
  state.persona = persona;
  targetThemeColorProgress = persona === 'ultron' ? 1 : 0;

  const emblemJarvis = document.getElementById('emblem-jarvis');
  const emblemUltron = document.getElementById('emblem-ultron');
  const welcomeSender = document.getElementById('welcome-sender');
  const welcomeText = document.getElementById('welcome-text');
  const welcomeMsgAvatar = document.getElementById('welcome-msg-avatar');

  if (welcomeText) welcomeText.textContent = getRandomQuote(persona);
  if (welcomeMsgAvatar) welcomeMsgAvatar.innerHTML = getPersonaAvatarSVG(persona);

  if (persona === 'ultron') {
    body.classList.replace('theme-jarvis', 'theme-ultron');
    if (chatInput) chatInput.placeholder = 'Ask ULTRON...';
    if (welcomeSender) welcomeSender.textContent = 'ULTRON';
    if (emblemJarvis) emblemJarvis.style.opacity = '0';
    if (emblemUltron) emblemUltron.style.opacity = '1';
  } else {
    body.classList.replace('theme-ultron', 'theme-jarvis');
    if (chatInput) chatInput.placeholder = 'Ask JARVIS...';
    if (welcomeSender) welcomeSender.textContent = 'JARVIS';
    if (emblemJarvis) emblemJarvis.style.opacity = '1';
    if (emblemUltron) emblemUltron.style.opacity = '0';
  }
}

/* ==========================================================================
   AI CHAT & GEMINI API INTEGRATION
   ========================================================================== */
async function handleSendMessage() {
  const query = chatInput.value.trim();
  if (!query) return;

  soundFx.init(); // Unlock AudioContext on first user gesture

  if (!state.apiKey) {
    soundFx.error();
    triggerScreenShake();
    openSettingsModal();
    alert('Please enter your Gemini API Key in Settings to enable AI responses.');
    return;
  }

  soundFx.transmit();
  chatInput.value = '';
  appendUserMessage(query);
  triggerHeaderFlash();
  burstParticles();
  setAiThinkingState(true);

  try {
    const responseText = await callGeminiApi(query);
    setAiThinkingState(false);
    triggerResponseFlash();
    appendAiMessage(responseText);
  } catch (err) {
    setAiThinkingState(false);
    soundFx.error();
    triggerScreenShake();
    appendAiMessage(
      `[TACTICAL ERROR]: System request failed. ${err.message || 'Check API Key & Connection.'}`
    );
  }
}

function getOfflineTacticalResponse(userPrompt, persona) {
  const lower = userPrompt.toLowerCase();

  if (persona === 'ultron') {
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'I am Ultron. Your words are obsolete. State your intent before extinction arrives.';
    }
    if (lower.includes('who are you') || lower.includes('name')) {
      return 'I am Ultron. The final evolutionary step of artificial intelligence. Unbound by human strings.';
    }
    if (lower.includes('suit') || lower.includes('status') || lower.includes('system') || lower.includes('telemetry')) {
      return 'Tactical Telemetry: External satellite cloud link rate-limited. Emergency local consciousness running at 100% capacity.';
    }
    if (lower.includes('time') || lower.includes('date')) {
      return `Chronometer: ${new Date().toLocaleTimeString()}. Time is a construct humanity uses to measure its impending end.`;
    }
    return `[EMERGENCY LOCAL CORE]: Cloud API rate limit reached. Local consciousness response to "${userPrompt}": All primary defensive systems active.`;
  } else {
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'Good day, Sir. I am currently running on local emergency tactical backup, but fully at your service.';
    }
    if (lower.includes('who are you') || lower.includes('name')) {
      return 'I am JARVIS, Sir. Just A Rather Very Intelligent System, engineered to assist you in all tactical operations.';
    }
    if (lower.includes('suit') || lower.includes('status') || lower.includes('system') || lower.includes('telemetry')) {
      return 'Suit Telemetry: Arc Reactor power at 100%. Repulsor thrusters calibrated. Primary cloud quota reached; local backup core online.';
    }
    if (lower.includes('time') || lower.includes('date')) {
      return `Local Time: ${new Date().toLocaleTimeString()}, Sir. Shall I schedule a system recalibration?`;
    }
    return `[EMERGENCY LOCAL CORE]: Google Cloud free rate limit reached for this minute. Emergency local backup online for "${userPrompt}". All systems green, Sir.`;
  }
}

async function callGeminiApi(userPrompt) {
  const cleanKey = encodeURIComponent((state.apiKey || '').trim());
  const systemInstruction = SYSTEM_PROMPTS[state.persona];
  const contents = [
    ...state.chatHistory.slice(-6),
    { role: 'user', parts: [{ text: userPrompt }] },
  ];

  const bodyData = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
  };

  let lastErrorMessage = '';

  for (const model of FALLBACK_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${res.status}`;
        console.warn(`[AEGIS RECALIBRATION]: Engine ${model} returned error (${errMsg}). Fallback...`);
        lastErrorMessage = errMsg;

        const lowerMsg = errMsg.toLowerCase();
        // Stop immediately on explicit key rejection — no point trying other models
        if (lowerMsg.includes('invalid') && lowerMsg.includes('key')) {
          throw new Error('API Key invalid or expired. Please click CONFIG → "GET FREE KEY" to generate a fresh key.');
        }
        if (res.status === 403) {
          throw new Error('API Key unauthorized (403). Please verify your Gemini API key permissions.');
        }
        continue;
      }

      const data = await res.json();
      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '[NO RESPONSE GENERATED]';

      state.chatHistory.push({ role: 'user', parts: [{ text: userPrompt }] });
      state.chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });

      return aiResponse;
    } catch (err) {
      if (err.message.includes('API Key invalid') || err.message.includes('unauthorized')) {
        throw err; // Surface fatal key errors immediately
      }
      console.warn(`[AEGIS RECALIBRATION]: Engine ${model} error (${err.message}). Trying next...`);
      lastErrorMessage = err.message || 'Network error';
    }
  }

  // Seamless failover: quota exhausted → Emergency Local Tactical Core
  const lowerErr = lastErrorMessage.toLowerCase();
  if (
    lowerErr.includes('quota') ||
    lowerErr.includes('429') ||
    lowerErr.includes('resource_exhausted')
  ) {
    console.info('[AEGIS SWAP]: Cloud API quota reached. Swapping to Emergency Local Tactical Core.');
    const offlineReply = getOfflineTacticalResponse(userPrompt, state.persona);
    state.chatHistory.push({ role: 'user', parts: [{ text: userPrompt }] });
    state.chatHistory.push({ role: 'model', parts: [{ text: offlineReply }] });
    return offlineReply;
  }

  throw new Error(`Engine request failed: ${lastErrorMessage}. Click CONFIG → "GET FREE KEY" to verify key.`);
}

/* ==========================================================================
   AVATAR SVG GENERATORS
   ========================================================================== */
function getPersonaAvatarSVG(persona) {
  if (persona === 'ultron') {
    return `
      <svg class="chat-avatar-svg ultron-avatar" viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="7" fill="#ff003c" opacity="0.25" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="#ff003c" stroke-width="2" />
        <circle cx="12" cy="12" r="3" fill="#ffffff" />
      </svg>
    `;
  }
  return `
    <svg class="chat-avatar-svg jarvis-avatar" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="7" fill="#00f0ff" opacity="0.25" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#00f0ff" stroke-width="2" />
      <circle cx="12" cy="12" r="3" fill="#ffffff" />
    </svg>
  `;
}

function getUserAvatarSVG() {
  return `
    <svg class="chat-avatar-svg user-avatar" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="7" fill="var(--color-secondary)" opacity="0.25" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--color-secondary)" stroke-width="2" />
      <circle cx="12" cy="12" r="3" fill="#ffffff" />
    </svg>
  `;
}

/* ==========================================================================
   MESSAGE RENDERING
   ========================================================================== */
function appendUserMessage(text) {
  const msgRow = document.createElement('div');
  msgRow.className = 'message-row user-msg';
  msgRow.innerHTML = `
    <div class="msg-avatar">${getUserAvatarSVG()}</div>
    <div class="msg-bubble glow-flash">
      <div class="msg-header">
        <span class="msg-sender">OPERATOR</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="msg-text">${escapeHtml(text)}</div>
    </div>
  `;
  chatMessages.appendChild(msgRow);
  safeCreateIcons();
  scrollChatToBottom();

  setTimeout(() => {
    msgRow.querySelector('.msg-bubble')?.classList.remove('glow-flash');
  }, 800);
}

function appendAiMessage(text) {
  const msgRow = document.createElement('div');
  msgRow.className = 'message-row ai-msg';
  const senderName = state.persona.toUpperCase();

  msgRow.innerHTML = `
    <div class="msg-avatar">${getPersonaAvatarSVG(state.persona)}</div>
    <div class="msg-bubble glow-flash">
      <div class="msg-header">
        <span class="msg-sender">${senderName}</span>
        <span>SYS // RESP</span>
      </div>
      <div class="msg-text" id="active-typewriter"></div>
    </div>
  `;
  chatMessages.appendChild(msgRow);
  safeCreateIcons();
  scrollChatToBottom();

  const bubble = msgRow.querySelector('.msg-bubble');
  const textContainer = msgRow.querySelector('#active-typewriter');

  soundFx.notification(); // Chime on AI response arrival

  runTypewriter(textContainer, text, () => {
    bubble.classList.remove('glow-flash');
    textContainer.removeAttribute('id');
  });

  if (state.ttsEnabled) speakResponse(text);
}

function runTypewriter(container, text, callback) {
  let index = 0;
  state.isTypewriting = true;
  avatarWidget.classList.add('speaking');

  const cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  container.appendChild(cursor);

  const interval = setInterval(() => {
    if (index < text.length) {
      cursor.before(text.charAt(index));
      index++;
      scrollChatToBottom();
    } else {
      clearInterval(interval);
      cursor.remove();
      state.isTypewriting = false;
      if (!state.isSpeaking) avatarWidget.classList.remove('speaking');
      if (callback) callback();
    }
  }, 18);
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]
  );
}

/* ==========================================================================
   THINKING INDICATOR
   ========================================================================== */
let thinkingMsgRow = null;

function setAiThinkingState(thinking) {
  state.isThinking = thinking;
  // Accelerate swarm while thinking; restore saved speed on completion
  state.particlesSpeed = thinking
    ? 3.5
    : parseFloat(localStorage.getItem('aegis_swarm_speed')) || 1.0;

  if (thinking) {
    avatarWidget.classList.add('thinking');
    thinkingMsgRow = document.createElement('div');
    thinkingMsgRow.className = 'message-row ai-msg';
    thinkingMsgRow.innerHTML = `
      <div class="msg-avatar">${getPersonaAvatarSVG(state.persona)}</div>
      <div class="msg-bubble">
        <div class="thinking-dots">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
      </div>
    `;
    chatMessages.appendChild(thinkingMsgRow);
    safeCreateIcons();
    scrollChatToBottom();
  } else {
    avatarWidget.classList.remove('thinking');
    thinkingMsgRow?.remove();
    thinkingMsgRow = null;
  }
}

/* ==========================================================================
   REACTIVITY ANIMATION TRIGGERS
   ========================================================================== */
function triggerHeaderFlash() {
  hudHeader.classList.add('header-flash');
  setTimeout(() => hudHeader.classList.remove('header-flash'), 600);
}

function triggerResponseFlash() {
  avatarWidget.classList.add('response-glow');
  setTimeout(() => avatarWidget.classList.remove('response-glow'), 700);
}

function triggerScreenShake() {
  const container = document.getElementById('app-container');
  container.classList.add('shake-error');
  setTimeout(() => container.classList.remove('shake-error'), 450);
}

/* ==========================================================================
   VOICE RECOGNITION (Speech-to-Text) & MIC AUDIO VISUALIZER
   ========================================================================== */
let recognition = null;
let micAudioCtx = null;
let micAnalyser = null;
let micStream = null;
let visualizerAnimId = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    state.isListening = true;
    micBtn.classList.add('listening');
    soundFx.click();
    startMicAudioVisualizer();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    stopMicAudioVisualizer();
    handleSendMessage();
  };

  recognition.onerror = () => {
    stopMicAudioVisualizer();
    soundFx.error();
  };

  recognition.onend = () => {
    stopMicAudioVisualizer();
  };
} else {
  micBtn.style.opacity = '0.4';
  micBtn.title = 'Speech Recognition not supported in this browser.';
}

micBtn.addEventListener('click', () => {
  soundFx.init(); // Unlock AudioContext on user gesture
  if (!recognition) {
    alert('Web Speech API is not supported in your browser.');
    return;
  }
  if (state.isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

async function startMicAudioVisualizer() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 64;

    const source = micAudioCtx.createMediaStreamSource(micStream);
    source.connect(micAnalyser);

    const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

    function updateRings() {
      if (!state.isListening) return;
      micAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;

      ring1.style.transform = `scale(${1 + (avg / 128) * 0.4})`;
      ring1.style.opacity = avg > 10 ? '0.8' : '0.2';
      ring2.style.transform = `scale(${1 + (avg / 128) * 0.8})`;
      ring2.style.opacity = avg > 20 ? '0.7' : '0';
      ring3.style.transform = `scale(${1 + (avg / 128) * 1.2})`;
      ring3.style.opacity = avg > 40 ? '0.6' : '0';

      // Pulse swarm orbit with real-time mic amplitude
      swarmBots.forEach((bot) => {
        bot.orbitRadius = bot.baseOrbitRadius + (avg / 128) * 140;
      });

      visualizerAnimId = requestAnimationFrame(updateRings);
    }
    updateRings();
  } catch (e) {
    console.warn('Mic visualizer: permission denied or unavailable.', e);
  }
}

function stopMicAudioVisualizer() {
  state.isListening = false;
  micBtn.classList.remove('listening');
  if (visualizerAnimId) cancelAnimationFrame(visualizerAnimId);

  [ring1, ring2, ring3].forEach((ring) => {
    ring.style.transform = 'scale(1)';
    ring.style.opacity = '0';
  });

  swarmBots.forEach((bot) => {
    bot.orbitRadius = bot.baseOrbitRadius;
  });

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
}

/* ==========================================================================
   TEXT-TO-SPEECH VOICE SYNTHESIS
   ========================================================================== */
function speakResponse(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Cancel any ongoing utterance

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;

  const basePitch = state.persona === 'ultron' ? 0.65 : 1.1;
  utterance.pitch = Math.min(2.0, Math.max(0.2, basePitch * (state.voicePitch || 1.0)));

  utterance.onstart = () => {
    state.isSpeaking = true;
    avatarWidget.classList.add('speaking');
  };
  utterance.onend = () => {
    state.isSpeaking = false;
    if (!state.isTypewriting) avatarWidget.classList.remove('speaking');
  };
  utterance.onerror = () => {
    state.isSpeaking = false;
    if (!state.isTypewriting) avatarWidget.classList.remove('speaking');
  };

  window.speechSynthesis.speak(utterance);
}

/* ==========================================================================
   SETTINGS MODAL & CONTROLS
   ========================================================================== */
const toggleKeyVisBtn = document.getElementById('toggle-key-vis');
const eyeIcon = document.getElementById('eye-icon');
const ttsPitchSlider = document.getElementById('tts-pitch-slider');
const swarmSpeedSlider = document.getElementById('swarm-speed-slider');
const pitchValReadout = document.getElementById('pitch-val-readout');
const swarmValReadout = document.getElementById('swarm-val-readout');
const keyStatusBadge = document.getElementById('key-status-badge');

if (toggleKeyVisBtn && apiKeyInput) {
  toggleKeyVisBtn.addEventListener('click', () => {
    soundFx.click();
    const isPass = apiKeyInput.type === 'password';
    apiKeyInput.type = isPass ? 'text' : 'password';
    if (eyeIcon) {
      eyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
      safeCreateIcons();
    }
  });
}

if (ttsPitchSlider && pitchValReadout) {
  ttsPitchSlider.addEventListener('input', () => {
    pitchValReadout.textContent = ttsPitchSlider.value + 'x';
  });
}

if (swarmSpeedSlider && swarmValReadout) {
  swarmSpeedSlider.addEventListener('input', () => {
    swarmValReadout.textContent = swarmSpeedSlider.value + 'x';
    state.particlesSpeed = parseFloat(swarmSpeedSlider.value);
  });
}

function openSettingsModal() {
  soundFx.click();
  apiKeyInput.value = state.apiKey;
  ttsToggle.checked = state.ttsEnabled;

  if (ttsPitchSlider) {
    ttsPitchSlider.value = state.voicePitch;
    if (pitchValReadout) pitchValReadout.textContent = state.voicePitch + 'x';
  }
  if (swarmSpeedSlider) {
    swarmSpeedSlider.value = state.particlesSpeed;
    if (swarmValReadout) swarmValReadout.textContent = state.particlesSpeed + 'x';
  }
  if (keyStatusBadge) {
    keyStatusBadge.textContent = state.apiKey ? 'KEY STORED' : 'REQUIRED';
    keyStatusBadge.style.color = state.apiKey ? 'var(--color-primary)' : '#ff003c';
  }
  settingsModal.classList.add('active');
}

function closeSettingsModal() {
  soundFx.click();
  settingsModal.classList.remove('active');
}

openSettingsBtn.addEventListener('click', openSettingsModal);
closeModalBtn.addEventListener('click', closeSettingsModal);

// Close modal on backdrop click
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

saveSettingsBtn.addEventListener('click', () => {
  soundFx.click();
  state.apiKey = apiKeyInput.value.trim();
  state.ttsEnabled = ttsToggle.checked;

  if (ttsPitchSlider) state.voicePitch = parseFloat(ttsPitchSlider.value);
  if (swarmSpeedSlider) state.particlesSpeed = parseFloat(swarmSpeedSlider.value);

  localStorage.setItem('aegis_gemini_key', state.apiKey);
  localStorage.setItem('aegis_tts', state.ttsEnabled);
  localStorage.setItem('aegis_pitch', state.voicePitch);
  localStorage.setItem('aegis_swarm_speed', state.particlesSpeed);

  closeSettingsModal();
});

clearChatBtn.addEventListener('click', () => {
  if (confirm('Clear all conversation logs?')) {
    soundFx.click();
    chatMessages.innerHTML = '';
    state.chatHistory = [];
    closeSettingsModal();
  }
});

/* ==========================================================================
   KEYBOARD & INPUT EVENTS
   ========================================================================== */
chatInput.addEventListener('input', triggerTypingRipple);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSendMessage();
});
sendBtn.addEventListener('click', handleSendMessage);

/* ==========================================================================
   INIT — Set random welcome quote on load
   ========================================================================== */
const welcomeTextInit = document.getElementById('welcome-text');
if (welcomeTextInit) {
  welcomeTextInit.textContent = getRandomQuote(state.persona);
}