/* ABC Adventure - plain JavaScript, no libraries.
   Sections: 1 Data  2 Sound  3 Screens  4 Learn  5 Quiz  6 Settings  7 Start-up */

// ===== 1. DATA: [letter, word, emoji] =====
const WORDS = [
  ["A","Apple","🍎"],["B","Ball","⚽"],["C","Cat","🐱"],["D","Dog","🐶"],
  ["E","Elephant","🐘"],["F","Fish","🐟"],["G","Giraffe","🦒"],["H","Hat","🎩"],
  ["I","Ice cream","🍦"],["J","Juice","🧃"],["K","Kite","🪁"],["L","Lion","🦁"],
  ["M","Monkey","🐵"],["N","Nest","🪺"],["O","Orange","🍊"],["P","Penguin","🐧"],
  ["Q","Queen","👸"],["R","Rabbit","🐰"],["S","Sun","☀️"],["T","Tiger","🐯"],
  ["U","Umbrella","☂️"],["V","Van","🚐"],["W","Whale","🐳"],["X","Xylophone","🎹"],
  ["Y","Yo-yo","🪀"],["Z","Zebra","🦓"]
];
const QUESTIONS_PER_QUIZ = 10;
const $ = id => document.getElementById(id);
const settings = { sound: true, voice: true, rateIdx: 1 };
const RATES = [0.5, 0.65, 0.85], RATE_NAMES = ["Very slow", "Slow", "Normal"];

// ===== 2. SOUND (speech + beeps). Everything is wrapped in try/catch so
// the game keeps working if the phone/browser has no speech or audio. =====
let audioCtx;
function beep(freqs) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      const t = audioCtx.currentTime + i * 0.12;
      o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.start(t); o.stop(t + 0.2);
    });
  } catch (e) {}
}
// Voices come from the phone/PC. We list English ones and put the nicest-sounding first.
let voices = [], voiceIndex = 0;
const NICE = /(aria|jenny|samantha|zira|natasha|libby|google us english|google uk english female|karen|moira|tessa|female)/i;
function loadVoices() {
  try {
    voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => NICE.test(b.name) - NICE.test(a.name));
    const k = voices.findIndex(v => v.name === localStorage.getItem("abcVoice"));
    voiceIndex = k >= 0 ? k : 0;
    updateSettingsButtons();
  } catch (e) {}
}
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function say(text) {
  if (!settings.voice || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voices[voiceIndex]) u.voice = voices[voiceIndex];
    u.lang = "en-US"; u.rate = RATES[settings.rateIdx]; u.pitch = 1.15;   // slow and friendly
    speechSynthesis.speak(u);
  } catch (e) {}
}
const sayLetter = l => say(l);
const sayWord = w => say(w);
const sayInstruction = t => say(t);

// ===== 3. SCREENS =====
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  try { speechSynthesis.cancel(); } catch (e) {}
  if (id === "learn") renderLearn();
  if (id === "write") renderWrite();
  if (id === "shop") renderShop();
  if (id === "stickers") renderStickers();
  if (id === "cert") renderCert();
  if (id === "color") startColor(colorIdx);
  if (id === "colorpick") renderPick();
}
function burst() { // little star celebration
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    s.textContent = "⭐";
    s.style.left = "50%"; s.style.top = "40%";
    s.style.setProperty("--x", (Math.random() * 300 - 150) + "px");
    s.style.setProperty("--y", (Math.random() * 300 - 150) + "px");
    $("fx").appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}
function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ===== 4. LEARN ABC =====
let learnIndex = 0;
function renderLearn() {
  const [l, w, e] = WORDS[learnIndex];
  $("learnLetter").textContent = l + l.toLowerCase();   // "Aa"
  $("learnLetter").style.color = letterColor(learnIndex);
  $("learnEmoji").textContent = e;
  $("learnWord").textContent = w.toUpperCase();
  $("learnLine").textContent = `${l} is for ${w}!`;
  $("learnSound").textContent = `${l} says "${SOUNDS[learnIndex]}"`;
  $("learnCount").textContent = `${learnIndex + 1} / ${WORDS.length}`;
  bump($("learnLetter")); bump($("learnEmoji"));
}
function speakLearn() { const [l, w] = WORDS[learnIndex]; say(`${l}. ${l} says ${SOUNDS[learnIndex]}. ${l} is for ${w}!`); }
function moveLearn(step) {
  learnIndex = (learnIndex + step + WORDS.length) % WORDS.length;
  renderLearn(); beep([520]); speakLearn();
}

// ===== 5. QUIZ =====
let quiz = { mode: "letter", list: [], i: 0, score: 0, tries: 0, locked: false };

function startQuiz(mode) {
  quiz = { mode, list: shuffle(WORDS).slice(0, QUESTIONS_PER_QUIZ), i: 0, score: 0, tries: 0, locked: false };
  quiz.prizes = []; show("quiz");
  renderQuestion();
}
function renderQuestion() {
  const [letter, word, emoji] = quiz.list[quiz.i];
  quiz.tries = 0; quiz.locked = false;
  setPal(CARTOONS[Math.floor(Math.random() * CARTOONS.length)]);
  $("qNum").textContent = `Question ${quiz.i + 1} / ${QUESTIONS_PER_QUIZ}`;
  $("score").textContent = `⭐ ${quiz.score}`;
  $("barFill").style.width = (quiz.i / QUESTIONS_PER_QUIZ * 100) + "%";
  $("feedback").textContent = "\u00A0"; $("feedback").className = "feedback";

  // each mode shows different things
  $("qEmoji").textContent = quiz.mode === "picture" ? emoji : "";
  $("replay").style.display = quiz.mode === "listen" ? "" : "none";
  $("prompt").textContent =
    quiz.mode === "letter" ? `Which letter starts ${word}? ${emoji}` :
    quiz.mode === "picture" ? `Which letter does ${word} start with?` :
    "Which letter did you hear?";
  bump($("qEmoji"));

  // 1 right answer + 2 different wrong letters, shuffled
  const wrong = shuffle(WORDS.filter(x => x[0] !== letter)).slice(0, 2).map(x => x[0]);
  $("choices").innerHTML = "";
  shuffle([letter, ...wrong]).forEach(l => {
    const b = document.createElement("button");
    b.className = "btn choice"; b.textContent = l;
    b.onclick = () => answer(b, l);
    $("choices").appendChild(b);
  });
  speakQuestion();
}
function speakQuestion() {
  const [letter, word] = quiz.list[quiz.i];
  if (quiz.mode === "listen") sayInstruction(`This is ${letter}. ${letter} is for ${word}. Tap the letter ${letter}.`);
  else if (quiz.mode === "letter") sayInstruction(`Which letter starts ${word}?`);
  else sayInstruction(`Which letter does ${word} start with?`);
}
function answer(btn, picked) {
  if (quiz.locked) return;
  const right = quiz.list[quiz.i][0];
  const fb = $("feedback");
  if (picked === right) {
    quiz.locked = true;
    if (quiz.tries === 0) { quiz.score++; addWin(); }           // point only if no wrong tries
    $("score").textContent = `⭐ ${quiz.score}`;
    btn.classList.add("right");
    fb.textContent = "Great job! 🎉"; fb.className = "feedback ok";
    applause(); beep([660, 880, 1100]); burst(); prize(); buzz(); setPal("🥳"); say("Great job!");
    setTimeout(nextQuestion, 1300);
  } else {
    quiz.tries++;
    btn.classList.add("wrong");
    fb.textContent = "Try again! 💪"; fb.className = "feedback no";
    beep([300]); setPal("🙈"); say("Try again!");
  }
}
function nextQuestion() {
  quiz.i++;
  if (quiz.i >= QUESTIONS_PER_QUIZ) return finishQuiz();
  renderQuestion();
}
function finishQuiz() {
  show("result");
  $("resultText").textContent = `You got ${quiz.score} out of ${QUESTIONS_PER_QUIZ}!`;
  $("resultStars").innerHTML = Array.from({ length: quiz.score }, (_, k) => `<span style="animation-delay:${k * 0.1}s">⭐</span>`).join("");
  $("resultPrizes").textContent = (quiz.prizes || []).join(" ");
  confetti(); applause(); beep([523, 659, 784, 1047]); burst(); say(`Great job! You got ${quiz.score} out of ${QUESTIONS_PER_QUIZ}!`);
}

// ===== 6. SETTINGS =====
function updateSettingsButtons() {
  $("tglSound").textContent = `🔔 Sounds: ${settings.sound ? "ON" : "OFF"}`;
  $("tglVoice").textContent = `🗣️ Voice: ${settings.voice ? "ON" : "OFF"}`;
  $("tglMusic").textContent = `🎵 Music: ${settings.music ? "ON" : "OFF"}`;
  const vn = voices[voiceIndex] ? voices[voiceIndex].name.replace(/Microsoft |Google |Online|\(Natural\)|\(.*?\)/g, "").trim() : "Default";
  $("tglVoiceStyle").textContent = `🎤 Voice: ${vn}`;
  $("tglSpeed").textContent = `🐢 Speed: ${RATE_NAMES[settings.rateIdx]}`;
}

// ===== 7. START-UP: connect every button =====
document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { beep([500]); show(b.dataset.go); });
document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { beep([500]); startQuiz(b.dataset.mode); });
$("prev").onclick = () => moveLearn(-1);
$("next").onclick = () => moveLearn(1);
$("speak").onclick = speakLearn;
$("learnLetter").onclick = () => { bump($("learnLetter")); speakLearn(); };
$("replay").onclick = speakQuestion;
$("again").onclick = () => startQuiz(quiz.mode);   // resets score
$("tglSound").onclick = () => { settings.sound = !settings.sound; updateSettingsButtons(); beep([600]); };
$("tglVoice").onclick = () => { settings.voice = !settings.voice; updateSettingsButtons(); say("Hello!"); };
updateSettingsButtons();

// floating letters on the background
const bg = $("bg");
for (let i = 0; i < 12; i++) {
  const s = document.createElement("span");
  s.textContent = WORDS[Math.floor(Math.random() * 26)][0];
  s.style.left = (Math.random() * 95) + "%";
  s.style.animationDuration = (10 + Math.random() * 12) + "s";
  s.style.animationDelay = (-Math.random() * 15) + "s";
  s.style.fontSize = (28 + Math.random() * 30) + "px";
  bg.appendChild(s);
}

// ===== 8. EXTRAS: applause, prizes, music, cartoons, writing =====
settings.music = true;
const CARTOONS = ["😺", "🐶", "🐼", "🦊", "🐸", "🦁"];
const PRIZES = ["🧸", "🏆", "🎁", "🚀", "🎈", "🍭", "🦄", "👑", "🎨", "🌈"];
function setPal(face) { $("pal").textContent = face; }
function ctx() { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); return audioCtx; }

// Applause = short bursts of random noise (many tiny "claps")
function applause() {
  if (!settings.sound) return;
  try {
    const c = ctx(), len = c.sampleRate * 1.6, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.2) * Math.min(1, t * 8) * (1 - t); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = 2500; g.gain.value = 0.7;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  } catch (e) {}
}
// Prize pops up in the middle of the screen and is saved for the results page
function prize() {
  const p = PRIZES[Math.floor(Math.random() * PRIZES.length)];
  (quiz.prizes = quiz.prizes || []).push(p);
  stickers[p] = (stickers[p] || 0) + 1; saveStickers();
  $("prize").textContent = p; $("prize").className = "";
  void $("prize").offsetWidth; $("prize").className = "show";
  setTimeout(() => ($("prize").className = ""), 1200);
}
// Background music: a happy looping tune played one note at a time
const TUNE = [523, 659, 784, 659, 523, 659, 784, 1047, 988, 784, 659, 784, 880, 784, 659, 523];
let musicTimer = null, musicStep = 0;
function musicOn() {
  if (musicTimer || !settings.music) return;
  try {
    const c = ctx();
    musicTimer = setInterval(() => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = "triangle"; o.frequency.value = TUNE[musicStep++ % TUNE.length] / 2;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.35);
    }, 380);
  } catch (e) {}
}
function musicOff() { clearInterval(musicTimer); musicTimer = null; }
document.addEventListener("pointerdown", musicOn, { once: true }); // browsers need a tap first
$("tglMusic").onclick = () => { settings.music = !settings.music; settings.music ? musicOn() : musicOff(); updateSettingsButtons(); };

// Writing pad: a faint dotted letter to trace with a finger or mouse
let writeIndex = 0, pad = $("pad"), pen = pad.getContext("2d"), inking = false;
function renderWrite() {
  const [l, w, e] = WORDS[writeIndex];
  $("writeHint").textContent = `Trace the letter ${l}! ${e}`;
  pen.clearRect(0, 0, 400, 400); inkCtx.clearRect(0, 0, 400, 400); renderPenBar(); idlePen();
  pen.font = "bold 340px Trebuchet MS, sans-serif"; pen.textAlign = "center"; pen.textBaseline = "middle";
  pen.fillStyle = "#ece6ff"; pen.fillText(l, 200, 215);
  pen.setLineDash([14, 12]); pen.lineWidth = 4; pen.strokeStyle = "#a58cff"; pen.strokeText(l, 200, 215);
  pen.setLineDash([]);
  say(`Write the letter ${l}`);
}
function penPos(ev) { const r = pad.getBoundingClientRect(); return [(ev.clientX - r.left) * 400 / r.width, (ev.clientY - r.top) * 400 / r.height]; }
// Every stroke is drawn twice: on the visible pad and on a hidden "ink" canvas used for checking
const inkc = document.createElement("canvas"); inkc.width = inkc.height = 400;
const inkCtx = inkc.getContext("2d");
let lastX = 0, lastY = 0;
let stampDist = 99;
function inkLine(x1, y1, x2, y2) {
  const p = PENS.find(q => q.id === currentPen), col = penColor(), k = p.kind;
  if (k === "rainbow") $("penDot").style.background = col;
  // 1) hidden plain copy - this is what checkWriting() looks at
  inkCtx.beginPath(); inkCtx.moveTo(x1, y1); inkCtx.lineTo(x2, y2);
  inkCtx.lineWidth = 22; inkCtx.lineCap = inkCtx.lineJoin = "round"; inkCtx.strokeStyle = "#000"; inkCtx.stroke();
  // 2) what the child sees: every pen has its own style
  pen.save(); pen.setLineDash([]); pen.lineCap = pen.lineJoin = "round"; pen.lineWidth = 22; pen.strokeStyle = col;
  const line = () => { pen.beginPath(); pen.moveTo(x1, y1); pen.lineTo(x2, y2); pen.stroke(); };
  const dot = (c, r, spread) => { pen.fillStyle = c; pen.beginPath(); pen.arc(x2 + (Math.random() - .5) * spread, y2 + (Math.random() - .5) * spread, r, 0, 7); pen.fill(); };
  if (k === "crayon") { pen.globalAlpha = .85; line(); pen.globalAlpha = 1; for (let i = 0; i < 4; i++) dot("rgba(255,255,255,.55)", 1.5, 20); }
  else if (k === "neon") { pen.shadowColor = col; pen.shadowBlur = 18; pen.lineWidth = 14; line(); pen.shadowBlur = 0; pen.strokeStyle = "#fff"; pen.lineWidth = 4; line(); }
  else if (k === "glitter") { pen.lineWidth = 20; line(); for (let i = 0; i < 4; i++) dot(["#fff", "#ffe066", "#ffb3e6"][i % 3], 2 + Math.random() * 2, 26); }
  else if (k === "fire") { pen.strokeStyle = `hsl(${10 + Math.random() * 40},100%,${50 + Math.random() * 10}%)`; pen.shadowColor = "#ff3d00"; pen.shadowBlur = 14; pen.lineWidth = 18 + Math.random() * 8; line(); }
  else if (k === "galaxy") { pen.strokeStyle = `hsl(${240 + Math.random() * 50},70%,${25 + Math.random() * 15}%)`; pen.lineWidth = 24; line(); for (let i = 0; i < 3; i++) dot("#fff", 1 + Math.random() * 1.5, 22); }
  else if (k === "star" || k === "heart") {
    stampDist += Math.hypot(x2 - x1, y2 - y1);
    if (stampDist > 24) { stampDist = 0; pen.font = "30px serif"; pen.textAlign = "center"; pen.textBaseline = "middle"; pen.fillText(k === "star" ? "⭐" : "💖", x2, y2); }
  }
  else line();   // pencil and rainbow
  pen.restore();
}
pad.onpointerdown = ev => { inking = true; stampDist = 99; movePen(ev); pad.setPointerCapture(ev.pointerId); [lastX, lastY] = penPos(ev); inkLine(lastX, lastY, lastX + 0.1, lastY); };
pad.onpointermove = ev => { movePen(ev); if (!inking) return; const [x, y] = penPos(ev); inkLine(lastX, lastY, x, y); lastX = x; lastY = y; };
pad.onpointerup = pad.onpointercancel = () => { inking = false; };
function moveWrite(step) { writeIndex = (writeIndex + step + WORDS.length) % WORDS.length; renderWrite(); }
$("wPrev").onclick = () => moveWrite(-1);
$("wNext").onclick = () => moveWrite(1);
$("wClear").onclick = renderWrite;
// Checks the drawing against the letter shape (see checkWriting below)
$("wDone").onclick = () => {
  if (checkWriting()) { addWin(); applause(); beep([660, 880, 1100]); burst(); prize(); buzz(); say("Great writing!"); setTimeout(() => moveWrite(1), 1400); }
  else {
    beep([300]); say("Try again!");
    $("writeHint").textContent = "Try again! Trace the dotted letter 💪";
    pad.classList.remove("shake"); void pad.offsetWidth; pad.classList.add("shake");
    setTimeout(renderWrite, 1300);   // clears the pad so they can retry
  }
};
updateSettingsButtons();

// How the check works: (1) draw the real letter on a hidden canvas, (2) split it into
// 20px cells, (3) every cell the letter covers must have pink ink nearby, and
// (4) not too much ink may be outside the letter. So a "d" drawn over a "p" fails.
function checkWriting() {
  const N = 400, C = 20, G = N / C;
  const m = document.createElement("canvas"); m.width = m.height = N;
  const mc = m.getContext("2d");
  mc.font = pen.font; mc.textAlign = "center"; mc.textBaseline = "middle";
  const l = WORDS[writeIndex][0];
  mc.fillText(l, 200, 215);
  const glyph = mc.getImageData(0, 0, N, N).data;      // exact letter
  mc.lineWidth = 50; mc.lineJoin = "round"; mc.strokeText(l, 200, 215);
  const wide = mc.getImageData(0, 0, N, N).data;       // letter + allowed wobble
  const ink = inkCtx.getImageData(0, 0, N, N).data;   // only the child's strokes
  const need = new Array(G * G).fill(0), has = new Array(G * G).fill(false);
  let inkPx = 0, outPx = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, cell = Math.floor(y / C) * G + Math.floor(x / C);
    if (glyph[i + 3] > 128) need[cell]++;
    if (ink[i + 3] > 200) {   // any pen colour
      inkPx++; has[cell] = true;
      if (wide[i + 3] < 128) outPx++;
    }
  }
  let needed = 0, covered = 0;
  for (let cy = 0; cy < G; cy++) for (let cx = 0; cx < G; cx++) {
    if (need[cy * G + cx] < 0.3 * C * C) continue;
    needed++;
    let near = false;                                  // ink in this cell or a neighbour?
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ny = cy + dy, nx = cx + dx;
      if (ny >= 0 && ny < G && nx >= 0 && nx < G && has[ny * G + nx]) near = true;
    }
    if (near) covered++;
  }
  return inkPx > 300 && covered / needed >= 0.75 && outPx / inkPx <= 0.3;  // tweak these numbers to make it easier or harder
}

// ===== 9. WINS & PEN SHOP =====
// Every correct answer / good letter = 1 win. Wins are spent in the shop. Saved in the browser.
const PENS = [
  { id: "pink",    name: "Pencil",      c: "#FF5C8A", cost: 0,  badge: "✏️", kind: "plain" },
  { id: "crayon",  name: "Crayon",      c: "#3D9BFF", cost: 3,  badge: "🖍️", kind: "crayon" },
  { id: "neon",    name: "Neon Glow",   c: "#19E68C", cost: 6,  badge: "💡", kind: "neon" },
  { id: "glitter", name: "Glitter",     c: "#C77DFF", cost: 9,  badge: "✨", kind: "glitter" },
  { id: "fire",    name: "Fire",        c: "#FF6A00", cost: 12, badge: "🔥", kind: "fire" },
  { id: "rainbow", name: "Rainbow",     c: "#FF4FA0", cost: 16, badge: "🌈", kind: "rainbow" },
  { id: "galaxy",  name: "Galaxy",      c: "#4B2FA0", cost: 20, badge: "🌌", kind: "galaxy" },
  { id: "star",    name: "Star Stamp",  c: "#FFC400", cost: 24, badge: "⭐", kind: "star" },
  { id: "heart",   name: "Heart Stamp", c: "#FF3B7F", cost: 28, badge: "💖", kind: "heart" }
];
// Pen icon drawn as a little SVG picture (body, shine, wooden tip, coloured nib)
function penIcon(p) {
  const f = p.kind === "rainbow" ? "url(#rbw)" : p.c;
  return `<svg viewBox="0 0 64 64"><defs><linearGradient id="rbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4d4d"/><stop offset=".35" stop-color="#ffd23f"/><stop offset=".65" stop-color="#3ddc84"/><stop offset="1" stop-color="#4d7cff"/></linearGradient></defs><g transform="rotate(45 32 32)"><rect x="25" y="3" width="14" height="40" rx="6" fill="${f}"/><rect x="28" y="6" width="3" height="32" rx="1.5" fill="#fff" opacity=".45"/><path d="M25 43h14l-7 16z" fill="#f6dcb5"/><path d="M29.5 53h5L32 59z" fill="${f}"/></g></svg>`;
}
let wins = 0, ownedPens = ["pink"], currentPen = "pink", hue = 0;
try { const sv = JSON.parse(localStorage.getItem("abcSave")); if (sv) { wins = sv.wins; ownedPens = sv.owned; currentPen = sv.pen; } } catch (e) {}
// Old saves may contain pens that no longer exist
ownedPens = ownedPens.filter(id => PENS.some(p => p.id === id));
if (!ownedPens.includes("pink")) ownedPens.unshift("pink");
if (!ownedPens.includes(currentPen)) currentPen = "pink";
function save() { try { localStorage.setItem("abcSave", JSON.stringify({ wins, owned: ownedPens, pen: currentPen })); } catch (e) {} }
function updateWins() { document.querySelectorAll(".wins").forEach(e => (e.textContent = `🏅 ${wins} wins`)); }
function addWin() { wins++; save(); updateWins(); }
function penColor() {
  if (currentPen === "rainbow") { hue = (hue + 5) % 360; return `hsl(${hue},90%,55%)`; }
  return PENS.find(p => p.id === currentPen).c;
}
function renderPenBar() {   // pens you own, shown above the writing pad
  $("penBar").innerHTML = ""; $("penDot").style.background = PENS.find(p => p.id === currentPen).c; $("penTip").querySelector(".pe").innerHTML = penIcon(PENS.find(p => p.id === currentPen));
  PENS.filter(p => ownedPens.includes(p.id)).forEach(p => {
    const b = document.createElement("button");
    b.className = "pen" + (p.id === currentPen ? " on" : "");
    b.innerHTML = penIcon(p); b.style.borderColor = p.c; b.setAttribute("aria-label", p.name + " pen");
    b.onclick = () => { currentPen = p.id; save(); renderPenBar(); beep([600]); };
    $("penBar").appendChild(b);
  });
}
function renderShop() {
  updateWins(); $("shopList").innerHTML = "";
  PENS.forEach(p => {
    const owned = ownedPens.includes(p.id), card = document.createElement("div"), b = document.createElement("button");
    card.className = "item";
    card.innerHTML = `<div class="pi" style="border-color:${p.c}">${penIcon(p)}<b>${p.badge}</b></div><div class="nm">${p.name}</div>`;
    b.className = "btn";
    if (owned) {
      b.textContent = p.id === currentPen ? "✔ Using" : "Use";
      b.classList.add(p.id === currentPen ? "green" : "blue");
      b.onclick = () => { currentPen = p.id; save(); beep([600]); renderShop(); };
    } else if (wins >= p.cost) {
      b.textContent = `Buy 🏅 ${p.cost}`; b.classList.add("pink");
      b.onclick = () => { wins -= p.cost; ownedPens.push(p.id); currentPen = p.id; save(); applause(); burst(); say("New pen!"); renderShop(); };
    } else {
      b.textContent = `🔒 ${p.cost} 🏅`; b.style.background = "#9a94b5";
      b.onclick = () => { beep([300]); say("Win more to unlock!"); };
    }
    card.appendChild(b); $("shopList").appendChild(card);
  });
}
updateWins();

// Settings: change the voice (cycles through the best English voices) and the speaking speed
$("tglVoiceStyle").onclick = () => {
  if (voices.length) {
    voiceIndex = (voiceIndex + 1) % Math.min(voices.length, 8);
    try { localStorage.setItem("abcVoice", voices[voiceIndex].name); } catch (e) {}
    updateSettingsButtons();
  }
  say("Hello! Let us learn the alphabet!");
};
$("tglSpeed").onclick = () => { settings.rateIdx = (settings.rateIdx + 1) % RATES.length; updateSettingsButtons(); say("Let us learn the alphabet!"); };
updateSettingsButtons();

// A big visible pen follows the finger/mouse so the child can see what is drawing.
// Its tip (with a dot in the pen colour) sits exactly where the line is drawn.
function movePen(ev) {
  const r = pad.getBoundingClientRect(), t = $("penTip");
  t.style.left = (ev.clientX - r.left) + "px"; t.style.top = (ev.clientY - r.top) + "px";
  t.classList.remove("idle");
}
function idlePen() {   // resting spot (bottom right) with a little wiggle
  const t = $("penTip"); t.style.left = "85%"; t.style.top = "88%"; t.classList.add("idle");
}

// ===== 10. FUN EXTRAS: colours, phonics, talking mascot, confetti, stickers, certificate =====
const SOUNDS = ["ah","buh","kuh","duh","eh","fff","guh","huh","ih","juh","kuh","lll","mmm","nnn","oh","puh","kwuh","rrr","sss","tuh","uh","vvv","wuh","ks","yuh","zzz"];
const letterColor = i => `hsl(${i * 14},80%,52%)`;   // every letter gets its own colour
function buzz() { try { navigator.vibrate && navigator.vibrate(80); } catch (e) {} }
function confetti() {
  const cols = ["#FF5C8A", "#3D9BFF", "#2EBF7F", "#FFC400", "#8A5CF6"];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "%"; c.style.background = cols[i % 5];
    c.style.animationDelay = Math.random() * 0.8 + "s"; c.style.animationDuration = (2 + Math.random() * 1.5) + "s";
    $("fx").appendChild(c); setTimeout(() => c.remove(), 4500);
  }
}
// Talking mascot: tap Ellie and she hops, changes her speech bubble and speaks
const TALK = ["Hi! I am Ellie! 🐘", "Let us learn the ABC!", "Can you find the letter B?", "Draw a letter with me!", "You are a star! ⭐", "Win stickers and pens!"];
let talkI = 0;
function setTalk(speak) { $("bubble").textContent = TALK[talkI]; if (speak) say(TALK[talkI].replace(/[^\w\s!?'.]/g, "")); }
$("mascot").onclick = () => { talkI = (talkI + 1) % TALK.length; setTalk(true); beep([700, 900]); const m = $("mascot"); m.classList.remove("hop"); void m.offsetWidth; m.classList.add("hop"); };
setInterval(() => { if ($("home").classList.contains("active")) { talkI = (talkI + 1) % TALK.length; setTalk(false); } }, 5000);
// Sticker book: every prize you win is saved here
let stickers = {};
try { stickers = JSON.parse(localStorage.getItem("abcStickers")) || {}; } catch (e) {}
function saveStickers() { try { localStorage.setItem("abcStickers", JSON.stringify(stickers)); } catch (e) {} }
function renderStickers() {
  $("stickerCount").textContent = `${PRIZES.filter(p => stickers[p]).length} / ${PRIZES.length} stickers`;
  $("stickerGrid").innerHTML = PRIZES.map(p => stickers[p] ? `<div class="stk on">${p}<b>×${stickers[p]}</b></div>` : `<div class="stk">❔</div>`).join("");
}
// Certificate: type a name, then print it
function renderCert() {
  try { $("certName").value = localStorage.getItem("abcName") || ""; } catch (e) {}
  $("certInfo").textContent = `learned the ABC and won ${wins} wins!`;
  $("certStickers").textContent = PRIZES.filter(p => stickers[p]).join(" ") || "⭐";
}
$("certName").oninput = () => { try { localStorage.setItem("abcName", $("certName").value); } catch (e) {} };
$("printCert").onclick = () => window.print();
// Background: clouds drifting across the sky
for (let i = 0; i < 4; i++) {
  const c = document.createElement("span");
  c.className = "cloud"; c.textContent = "☁️";
  c.style.top = (4 + i * 14) + "%"; c.style.fontSize = (60 + i * 14) + "px";
  c.style.animationDuration = (40 + i * 15) + "s"; c.style.animationDelay = (-i * 12) + "s";
  $("bg").appendChild(c);
}

// ===== 11. COLORING: colour a picture one part at a time =====
// Each picture is a list of SVG parts. The current part blinks, the child picks 1 of 3 colours.
const COLORS = [["Red", "#FF3B3B"], ["Blue", "#3D9BFF"], ["Yellow", "#FFD23F"], ["Green", "#2EBF7F"],
                ["Orange", "#FF8A00"], ["Purple", "#8A5CF6"], ["Pink", "#FF7EB6"], ["Brown", "#9C6B3F"]];
const EYE = '<circle cx="58" cy="92" r="7" fill="#2B1B5E"/><circle cx="56" cy="90" r="2" fill="#fff"/>';
const SMILE = '<circle cx="86" cy="94" r="5" fill="#2B1B5E"/><circle cx="114" cy="94" r="5" fill="#2B1B5E"/><path d="M82 112Q100 130 118 112" fill="none" stroke="#2B1B5E" stroke-width="5" stroke-linecap="round"/>';
// One drawing for every letter. Each entry: ["part names", "fixed extras (eyes...)", part1, part2, ...]
const DOT = (x, y, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2B1B5E"/>`;
const EYES = y => DOT(80, y) + DOT(120, y);
const SMILEAT = y => `<path d="M86 ${y}q14 12 28 0" fill="none" stroke="#2B1B5E" stroke-width="5" stroke-linecap="round"/>`;
const RAW = [
  ["apple|leaf|stem", "", '<path d="M100 62C60 40 20 70 30 122c8 43 45 63 70 50 25 13 62-7 70-50 10-52-30-82-70-60z"/>', '<path d="M106 42C130 15 162 24 168 38 150 58 120 58 106 42z"/>', '<rect x="94" y="26" width="12" height="40" rx="6"/>'],
  ["ball|star", "", '<circle cx="100" cy="100" r="70"/>', '<path d="M100 60l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z"/>'],
  ["ears|cat|nose", EYES(98) + '<path d="M35 118h28M35 134l26-8M165 118h-28M165 134l-26-8" fill="none" stroke="#2B1B5E" stroke-width="4" stroke-linecap="round"/>', '<path d="M50 72L52 20L92 55zM150 72L148 20L108 55z"/>', '<circle cx="100" cy="112" r="60"/>', '<path d="M90 112h20l-10 12z"/>'],
  ["ears|dog|nose", EYES(95) + SMILEAT(146), '<ellipse cx="45" cy="105" rx="20" ry="40"/><ellipse cx="155" cy="105" rx="20" ry="40"/>', '<circle cx="100" cy="105" r="55"/>', '<ellipse cx="100" cy="125" rx="16" ry="11"/>'],
  ["ears|elephant|trunk", EYES(88), '<circle cx="45" cy="95" r="38"/><circle cx="155" cy="95" r="38"/>', '<circle cx="100" cy="100" r="55"/>', '<rect x="86" y="118" width="28" height="62" rx="14"/>'],
  ["fish|tail|fin", '<circle cx="58" cy="92" r="7" fill="#2B1B5E"/>', '<ellipse cx="88" cy="100" rx="62" ry="40"/>', '<path d="M142 100L192 62V138z"/>', '<path d="M76 64Q98 24 124 66z"/>'],
  ["neck|giraffe|spots", '<path d="M88 30v-14M112 30v-14" stroke="#2B1B5E" stroke-width="5" stroke-linecap="round"/>' + DOT(88, 52, 4) + DOT(112, 52, 4), '<rect x="75" y="80" width="50" height="115" rx="12"/>', '<ellipse cx="100" cy="55" rx="38" ry="30"/>', '<circle cx="92" cy="130" r="9"/><circle cx="112" cy="160" r="8"/>'],
  ["brim|hat|ribbon", "", '<ellipse cx="100" cy="140" rx="85" ry="22"/>', '<path d="M50 140V70q0-30 50-30t50 30v70z"/>', '<rect x="50" y="108" width="100" height="22"/>'],
  ["cone|ice cream|cherry", "", '<path d="M58 104H142L100 188z"/>', '<circle cx="100" cy="76" r="42"/>', '<circle cx="100" cy="30" r="11"/>'],
  ["cup|juice|straw", "", '<path d="M55 60h90l-12 125H67z"/>', '<path d="M60 100h80l-8 85H68z"/>', '<rect x="105" y="15" width="12" height="80" rx="6" transform="rotate(12 111 55)"/>'],
  ["kite|bows", '<path d="M100 15v145M40 85h120" stroke="#2B1B5E" stroke-width="3"/>', '<path d="M100 15L160 85L100 160L40 85z"/>', '<circle cx="92" cy="178" r="9"/><circle cx="108" cy="191" r="8"/>'],
  ["mane|lion|nose", EYES(95), '<circle cx="100" cy="100" r="82"/>', '<circle cx="100" cy="105" r="52"/>', '<path d="M88 112h24l-12 14z"/>'],
  ["ears|monkey|mouth", EYES(85) + SMILEAT(132), '<circle cx="38" cy="100" r="25"/><circle cx="162" cy="100" r="25"/>', '<circle cx="100" cy="95" r="60"/>', '<ellipse cx="100" cy="125" rx="35" ry="26"/>'],
  ["eggs|nest", "", '<ellipse cx="75" cy="105" rx="20" ry="26"/><ellipse cx="125" cy="105" rx="20" ry="26"/>', '<path d="M20 110q80-30 160 0q-10 70-80 70t-80-70z"/>'],
  ["orange|leaf", "", '<circle cx="100" cy="115" r="68"/>', '<path d="M100 50C110 20 140 18 150 28 140 50 115 55 100 50z"/>'],
  ["penguin|belly|beak", '<ellipse cx="75" cy="192" rx="18" ry="8" fill="#FF8A00"/><ellipse cx="125" cy="192" rx="18" ry="8" fill="#FF8A00"/>' + DOT(84, 72) + DOT(116, 72), '<ellipse cx="100" cy="115" rx="58" ry="75"/>', '<ellipse cx="100" cy="135" rx="38" ry="52"/>', '<path d="M88 82h24l-12 18z"/>'],
  ["face|crown|jewel", EYES(142) + SMILEAT(160), '<circle cx="100" cy="140" r="45"/>', '<path d="M45 75l20 30 35-45 35 45 20-30v52H45z"/>', '<circle cx="100" cy="100" r="9"/>'],
  ["ears|rabbit|nose", EYES(108), '<ellipse cx="70" cy="45" rx="16" ry="42"/><ellipse cx="130" cy="45" rx="16" ry="42"/>', '<circle cx="100" cy="120" r="55"/>', '<circle cx="100" cy="128" r="9"/>'],
  ["rays|sun", SMILE, Array.from({ length: 8 }, (_, i) => `<rect x="93" y="8" width="14" height="36" rx="7" transform="rotate(${i * 45} 100 100)"/>`).join(""), '<circle cx="100" cy="100" r="42"/>'],
  ["tiger|stripes|nose", EYES(98), '<circle cx="100" cy="100" r="70"/>', '<rect x="92" y="32" width="16" height="32" rx="6"/><rect x="40" y="70" width="30" height="14" rx="6"/><rect x="130" y="70" width="30" height="14" rx="6"/>', '<path d="M88 112h24l-12 14z"/>'],
  ["handle|umbrella|stripe", "", '<rect x="94" y="100" width="12" height="75" rx="6"/>', '<path d="M15 100Q15 20 100 20Q185 20 185 100Z"/>', '<path d="M100 20Q60 40 62 100H138Q140 40 100 20Z"/>'],
  ["van|window|wheels", "", '<rect x="15" y="70" width="170" height="80" rx="16"/>', '<rect x="110" y="82" width="62" height="35" rx="8"/>', '<circle cx="55" cy="155" r="20"/><circle cx="145" cy="155" r="20"/>'],
  ["tail|whale|water", DOT(55, 112), '<path d="M165 110l30-45 5 70z"/>', '<ellipse cx="95" cy="120" rx="80" ry="48"/>', '<circle cx="85" cy="55" r="9"/><circle cx="78" cy="38" r="7"/><circle cx="94" cy="32" r="7"/>'],
  ["bars|frame", "", '<rect x="28" y="40" width="26" height="110" rx="8"/><rect x="62" y="55" width="26" height="95" rx="8"/><rect x="96" y="70" width="26" height="80" rx="8"/><rect x="130" y="85" width="26" height="65" rx="8"/>', '<rect x="15" y="140" width="170" height="30" rx="10"/>'],
  ["yo-yo|middle|ring", '<path d="M100 37V70" stroke="#2B1B5E" stroke-width="5"/>', '<circle cx="100" cy="125" r="55"/>', '<circle cx="100" cy="125" r="25"/>', '<circle cx="100" cy="25" r="12"/>'],
  ["ears|zebra|stripes|nose", EYES(118), '<ellipse cx="68" cy="35" rx="12" ry="22"/><ellipse cx="132" cy="35" rx="12" ry="22"/>', '<ellipse cx="100" cy="105" rx="52" ry="68"/>', '<rect x="52" y="60" width="26" height="12" rx="6"/><rect x="122" y="60" width="26" height="12" rx="6"/><rect x="48" y="88" width="24" height="12" rx="6"/><rect x="128" y="88" width="24" height="12" rx="6"/>', '<ellipse cx="100" cy="150" rx="30" ry="22"/>']
];
// Build the final list: title, names and thing come from WORDS so A-Z always match
const PICS = RAW.map(([n, x, ...p], i) => ({
  title: `${WORDS[i][0]} is for ${WORDS[i][1]} ${WORDS[i][2]}`, thing: WORDS[i][1].toLowerCase(),
  names: n.split("|"), extra: x, parts: p
}));
let coloredDone = [];   // letters already finished (saved)
try { coloredDone = JSON.parse(localStorage.getItem("abcColored")) || []; } catch (e) {}
let colorIdx = 0, partIdx = 0, colorBusy = false;
const colorActive = () => $("color").classList.contains("active");
// ----- Manual painting -----
// 1) the part blinks, 2) child picks 1 of 3 colours, 3) child PAINTS inside the part with a finger.
// Paint is clipped to the part's shape. We split the picture into 8x8 cells and count how many
// cells of the current part were painted; at 70% the part is filled in and the next part starts.
const CELL = 8, GRID = 25;
let colorSel = null, painting = false, painted = false, cellHit = [], cellNeed = [], needCount = 0, covered = 0, curPath = null;
function startColor(i) {
  colorIdx = (i + PICS.length) % PICS.length; partIdx = 0;
  const pic = PICS[colorIdx];
  $("colorTitle").textContent = pic.title;
  const clips = pic.parts.map((p, k) => `<clipPath id="cl${k}">${p}</clipPath>`).join("");
  const parts = pic.parts.map((p, k) => `<g class="part" id="cp${k}">${p}<g id="pt${k}" clip-path="url(#cl${k})"></g><g class="ol">${p}</g></g>`).join("");
  $("colorArt").innerHTML = `<svg viewBox="0 0 200 200"><defs>${clips}</defs>${parts}${pic.extra}</svg>`;
  nextPart();
}
function computeCells() {   // which cells belong to the current part? (ask the browser what is under each cell)
  const r = $("colorArt").querySelector("svg").getBoundingClientRect();
  cellHit = new Array(GRID * GRID).fill(false); cellNeed = cellHit.slice(); needCount = 0; covered = 0;
  for (let cy = 0; cy < GRID; cy++) for (let cx = 0; cx < GRID; cx++) {
    const el = document.elementFromPoint(r.left + (cx * CELL + 4) / 200 * r.width, r.top + (cy * CELL + 4) / 200 * r.height);
    const p = el && el.closest && el.closest(".part");
    if (p && p.id === "cp" + partIdx) { cellNeed[cy * GRID + cx] = true; needCount++; }
  }
}
function nextPart() {
  if (!colorActive()) return;
  colorBusy = false; colorSel = null; painted = false; painting = false;
  const pic = PICS[colorIdx], name = pic.names[partIdx];
  $("cp" + partIdx).classList.add("cur");
  computeCells();
  $("colorHint").textContent = `🎨 Pick a color for the ${name}! (${partIdx + 1}/${pic.parts.length})`;
  $("colorChoices").innerHTML = "";
  shuffle(COLORS).slice(0, 3).forEach(([n, hex]) => {   // 3 random colours, each with its name
    const b = document.createElement("button");
    b.className = "swatch"; b.style.background = hex; b.innerHTML = `<span>${n}</span>`;
    b.onclick = () => {
      if (colorBusy || painted) return;                  // colour is locked once painting starts
      colorSel = { n, hex };
      document.querySelectorAll(".swatch").forEach(x => x.classList.remove("sel")); b.classList.add("sel");
      $("colorHint").textContent = `🖌️ Paint the ${name} ${n}! Draw inside it.`;
      beep([600]); say(`${n}! Now paint the ${name}.`);
    };
    $("colorChoices").appendChild(b);
  });
  say(`Pick a color for the ${name}!`);
}
const art = $("colorArt");
function artPoint(ev) { const r = art.querySelector("svg").getBoundingClientRect(); return [(ev.clientX - r.left) * 200 / r.width, (ev.clientY - r.top) * 200 / r.height]; }
function markCells(x, y) {
  for (let cy = Math.max(0, Math.floor((y - 12) / CELL)); cy <= Math.min(GRID - 1, Math.floor((y + 12) / CELL)); cy++)
    for (let cx = Math.max(0, Math.floor((x - 12) / CELL)); cx <= Math.min(GRID - 1, Math.floor((x + 12) / CELL)); cx++) {
      const i = cy * GRID + cx;
      if (cellNeed[i] && !cellHit[i] && Math.hypot(cx * CELL + 4 - x, cy * CELL + 4 - y) <= 12) { cellHit[i] = true; covered++; }
    }
}
art.onpointerdown = ev => {
  if (colorBusy || !colorActive() || !$("cp" + partIdx)) return;
  if (!colorSel) { say("Pick a color first!"); return; }
  painting = painted = true; art.setPointerCapture(ev.pointerId);
  const [x, y] = artPoint(ev);
  curPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  curPath.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + 0.1).toFixed(1)} ${y.toFixed(1)}`);
  curPath.setAttribute("fill", "none"); curPath.setAttribute("stroke", colorSel.hex);
  curPath.setAttribute("stroke-width", "24"); curPath.setAttribute("stroke-linecap", "round"); curPath.setAttribute("stroke-linejoin", "round");
  $("pt" + partIdx).appendChild(curPath);
  markCells(x, y); checkPart();
};
art.onpointermove = ev => {
  if (!painting || colorBusy) return;
  const [x, y] = artPoint(ev);
  curPath.setAttribute("d", curPath.getAttribute("d") + `L${x.toFixed(1)} ${y.toFixed(1)}`);
  markCells(x, y); checkPart();
};
art.onpointerup = art.onpointercancel = () => { painting = false; };
function checkPart() {
  const goal = Math.ceil(needCount * 0.7);
  if (covered >= goal) return finishPart();
  $("colorHint").textContent = `🖌️ Keep painting! ${Math.round(covered / goal * 100)}%`;
}
function finishPart() {   // part is painted enough: fill it completely, then next part
  colorBusy = true; painting = false;
  const el = $("cp" + partIdx);
  el.classList.remove("cur"); el.style.fill = colorSel.hex; el.classList.add("dab");
  beep([660, 880]); buzz(); say("Great painting!");
  partIdx++;
  setTimeout(partIdx < PICS[colorIdx].parts.length ? nextPart : finishColor, 900);
}
function finishColor() {
  if (!colorActive()) return;
  $("colorHint").textContent = "🎉 Beautiful! Great coloring!";
  if (!coloredDone.includes(colorIdx)) { coloredDone.push(colorIdx); try { localStorage.setItem("abcColored", JSON.stringify(coloredDone)); } catch (e) {} } $("colorChoices").innerHTML = "";
  addWin(); applause(); confetti(); burst(); prize(); buzz();
  say(`Beautiful! You colored the ${PICS[colorIdx].thing}!`);
  setTimeout(() => { if (colorActive()) startColor(colorIdx + 1); }, 2800);   // next picture
}
$("cPrev").onclick = () => startColor(colorIdx - 1);
$("cNext").onclick = () => startColor(colorIdx + 1);

// Picture picker: all 26 letters, finished ones get a tick
function renderPick() {
  $("pickGrid").innerHTML = "";
  WORDS.forEach(([l, w, e], i) => {
    const b = document.createElement("button");
    b.className = "pk" + (coloredDone.includes(i) ? " done" : "");
    b.innerHTML = `${l}<span>${e}</span>`;
    b.onclick = () => { colorIdx = i; beep([600]); show("color"); };
    $("pickGrid").appendChild(b);
  });
}
$("cPick").onclick = () => show("colorpick");
