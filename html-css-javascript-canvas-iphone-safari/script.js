"use strict";

const TWO_PI = Math.PI * 2;
const STORAGE_KEY = "okozukaiRouletteStats";

const prizes = [
  { label: "1000円", amount: 1000, probability: 0.001, visualWeight: 0.9, color: "#ff247f", accent: "#fff06a" },
  { label: "500円", amount: 500, probability: 0.002, visualWeight: 1.0, color: "#7e5cff", accent: "#68f7ff" },
  { label: "100円", amount: 100, probability: 0.015, visualWeight: 1.08, color: "#26d9ff", accent: "#ffffff" },
  { label: "50円", amount: 50, probability: 0.08, visualWeight: 1.14, color: "#65f7b4", accent: "#fff8b4" },
  { label: "10円", amount: 10, probability: 0.702, visualWeight: 1.45, color: "#ffd94a", accent: "#ff7a00" },
  { label: "5円", amount: 5, probability: 0.1, visualWeight: 1.16, color: "#ff944d", accent: "#ffffff" },
  { label: "1円", amount: 1, probability: 0.1, visualWeight: 1.12, color: "#ff8fd6", accent: "#ffffff" }
];

const canvas = document.getElementById("rouletteCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const resultText = document.getElementById("resultText");
const resultPanel = document.getElementById("resultPanel");
const totalSpinsEl = document.getElementById("totalSpins");
const totalAmountEl = document.getElementById("totalAmount");
const prizeListEl = document.getElementById("prizeList");
const sparkleLayer = document.getElementById("sparkleLayer");
const confettiLayer = document.getElementById("confettiLayer");
const appShell = document.getElementById("appShell");

let segments = [];
let rotation = 0;
let isSpinning = false;
let lastTickIndex = null;
let audioContext = null;

const stats = loadStats();

function loadStats() {
  const initialCounts = Object.fromEntries(prizes.map((prize) => [prize.label, 0]));

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) {
      return { totalSpins: 0, totalAmount: 0, counts: initialCounts };
    }

    return {
      totalSpins: Number(saved.totalSpins) || 0,
      totalAmount: Number(saved.totalAmount) || 0,
      counts: { ...initialCounts, ...(saved.counts || {}) }
    };
  } catch {
    return { totalSpins: 0, totalAmount: 0, counts: initialCounts };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function formatYen(amount) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

function setupSegments() {
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.visualWeight, 0);
  let start = -Math.PI / 2;

  segments = prizes.map((prize) => {
    const angle = (prize.visualWeight / totalWeight) * TWO_PI;
    const segment = {
      ...prize,
      start,
      end: start + angle,
      center: start + angle / 2
    };
    start += angle;
    return segment;
  });
}

function drawRoulette() {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = width * 0.47;
  const innerRadius = width * 0.13;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  drawOuterRim(outerRadius);

  segments.forEach((segment, index) => {
    drawSegment(segment, outerRadius, innerRadius, index);
  });

  drawSegmentSeparators(outerRadius, innerRadius);
  ctx.restore();

  drawGloss(width, height);
}

function drawOuterRim(radius) {
  const rimGradient = ctx.createRadialGradient(0, 0, radius * 0.58, 0, 0, radius * 1.07);
  rimGradient.addColorStop(0, "#fff7bf");
  rimGradient.addColorStop(0.48, "#ffbd2d");
  rimGradient.addColorStop(0.72, "#ff4fa3");
  rimGradient.addColorStop(1, "#7e2ac7");

  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.06, 0, TWO_PI);
  ctx.fillStyle = rimGradient;
  ctx.fill();

  ctx.lineWidth = radius * 0.045;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.stroke();

  const bulbCount = 28;
  for (let i = 0; i < bulbCount; i += 1) {
    const angle = (i / bulbCount) * TWO_PI;
    const x = Math.cos(angle) * radius * 0.99;
    const y = Math.sin(angle) * radius * 0.99;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180 + i);

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.026, 0, TWO_PI);
    ctx.fillStyle = i % 2 === 0 ? "#fff36c" : "#ffffff";
    ctx.shadowColor = i % 2 === 0 ? "#ffd94a" : "#26d9ff";
    ctx.shadowBlur = 8 + pulse * 9;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawSegment(segment, radius, innerRadius, index) {
  const segmentGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius);
  segmentGradient.addColorStop(0, lightenColor(segment.color, 36));
  segmentGradient.addColorStop(0.62, segment.color);
  segmentGradient.addColorStop(1, darkenColor(segment.color, 24));

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius * 0.9, segment.start, segment.end);
  ctx.closePath();
  ctx.fillStyle = segmentGradient;
  ctx.fill();

  ctx.save();
  ctx.rotate(segment.center);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.max(34, radius * 0.14)}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillStyle = index === 4 ? "#7c3600" : "#ffffff";
  ctx.shadowColor = "rgba(52, 20, 89, 0.35)";
  ctx.shadowBlur = 7;
  ctx.strokeText(segment.label, radius * 0.56, 0);
  ctx.fillText(segment.label, radius * 0.56, 0);

  ctx.beginPath();
  ctx.arc(radius * 0.34, 0, radius * 0.025, 0, TWO_PI);
  ctx.fillStyle = segment.accent;
  ctx.shadowBlur = 9;
  ctx.fill();
  ctx.restore();
}

function drawSegmentSeparators(radius, innerRadius) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";

  segments.forEach((segment) => {
    ctx.beginPath();
    ctx.moveTo(Math.cos(segment.start) * innerRadius, Math.sin(segment.start) * innerRadius);
    ctx.lineTo(Math.cos(segment.start) * radius * 0.9, Math.sin(segment.start) * radius * 0.9);
    ctx.stroke();
  });
}

function drawGloss(width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.43;
  const gloss = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  gloss.addColorStop(0.34, "rgba(255, 255, 255, 0.05)");
  gloss.addColorStop(0.64, "rgba(60, 35, 105, 0.08)");
  gloss.addColorStop(1, "rgba(60, 35, 105, 0.25)");

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.fillStyle = gloss;
  ctx.fill();
}

function renderStats() {
  totalSpinsEl.textContent = stats.totalSpins.toLocaleString("ja-JP");
  totalAmountEl.textContent = formatYen(stats.totalAmount);

  prizeListEl.innerHTML = "";
  prizes.forEach((prize) => {
    const row = document.createElement("div");
    row.className = "prize-row";
    row.innerHTML = `
      <span class="prize-chip" style="background:${prize.color}"></span>
      <span class="prize-name">${prize.label}</span>
      <span class="prize-count"><strong>${stats.counts[prize.label]}</strong> 回</span>
    `;
    prizeListEl.appendChild(row);
  });
}

function choosePrizeByProbability() {
  const roll = Math.random();
  let cumulative = 0;

  for (const prize of prizes) {
    cumulative += prize.probability;
    if (roll < cumulative) {
      return prize;
    }
  }

  return prizes[prizes.length - 1];
}

function calculateTargetRotation(prize) {
  const segment = segments.find((item) => item.label === prize.label);
  const pointerAngle = -Math.PI / 2;
  const segmentPadding = Math.min((segment.end - segment.start) * 0.22, 0.12);
  const randomInsideSegment = randomBetween(segment.start + segmentPadding, segment.end - segmentPadding);
  const baseTarget = pointerAngle - randomInsideSegment;
  const currentNormalized = normalizeAngle(rotation);
  const targetNormalized = normalizeAngle(baseTarget);
  const forwardDelta = normalizeAngle(targetNormalized - currentNormalized);
  const fullTurns = randomBetween(7.7, 9.2) * TWO_PI;

  return rotation + fullTurns + forwardDelta;
}

function startSpin() {
  if (isSpinning) {
    return;
  }

  unlockAudio();
  clickSound();
  resetResultEffects();

  const prize = choosePrizeByProbability();
  const startRotation = rotation;
  const targetRotation = calculateTargetRotation(prize);
  const duration = randomBetween(4100, 5000);
  const startTime = performance.now();

  isSpinning = true;
  lastTickIndex = null;
  spinButton.disabled = true;
  resultText.textContent = "ぐるぐる回転中...";

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    rotation = startRotation + (targetRotation - startRotation) * eased;
    playTickIfNeeded();
    drawRoulette();

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    finishSpin(prize);
  }

  requestAnimationFrame(frame);
}

function finishSpin(prize) {
  isSpinning = false;
  spinButton.disabled = false;
  rotation = normalizeAngle(rotation);

  stats.totalSpins += 1;
  stats.totalAmount += prize.amount;
  stats.counts[prize.label] += 1;
  saveStats();
  renderStats();

  resultText.textContent = getResultMessage(prize);
  resultPanel.classList.add("big-win");
  setTimeout(() => resultPanel.classList.remove("big-win"), 700);

  playWinEffects(prize);
}

function getResultMessage(prize) {
  if (prize.amount === 1000) {
    return "✨ JACKPOT !! 1000円！！ ✨";
  }

  return `🎉 ${prize.label}！！`;
}

function playWinEffects(prize) {
  stopSound();

  if (prize.amount >= 100) {
    createSparkles(prize.amount >= 500 ? 42 : 26);
    winSound(prize.amount);
  }

  if (prize.amount === 500) {
    resultPanel.classList.add("jackpot-text");
    appShell.classList.add("shake");
    setTimeout(() => {
      resultPanel.classList.remove("jackpot-text");
      appShell.classList.remove("shake");
    }, 1800);
  }

  if (prize.amount === 1000) {
    resultPanel.classList.add("jackpot-text");
    appShell.classList.add("flash", "shake");
    createConfetti(110);
    jackpotSound();
    vibrate([80, 60, 110, 60, 180]);

    const sparkleTimer = setInterval(() => createSparkles(18), 360);
    setTimeout(() => {
      clearInterval(sparkleTimer);
      resultPanel.classList.remove("jackpot-text");
      appShell.classList.remove("flash", "shake");
    }, 3600);
  }
}

function playTickIfNeeded() {
  const tickIndex = Math.floor(normalizeAngle(rotation) / (TWO_PI / 42));

  if (tickIndex !== lastTickIndex) {
    lastTickIndex = tickIndex;
    tickSound();
  }
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone({ frequency, duration, type = "sine", gain = 0.06, slideTo = null, delay = 0 }) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function clickSound() {
  playTone({ frequency: 420, slideTo: 780, duration: 0.06, type: "square", gain: 0.035 });
}

function tickSound() {
  playTone({ frequency: 950, slideTo: 520, duration: 0.025, type: "square", gain: 0.012 });
}

function stopSound() {
  playTone({ frequency: 160, slideTo: 90, duration: 0.16, type: "triangle", gain: 0.08 });
  playTone({ frequency: 520, slideTo: 220, duration: 0.18, type: "sine", gain: 0.04, delay: 0.06 });
}

function winSound(amount) {
  const notes = amount >= 500 ? [523.25, 659.25, 783.99, 1046.5] : [392, 523.25, 659.25];
  notes.forEach((frequency, index) => {
    playTone({ frequency, duration: 0.18, type: "triangle", gain: 0.055, delay: index * 0.09 });
  });
}

function jackpotSound() {
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
    playTone({ frequency, duration: 0.24, type: "sawtooth", gain: 0.055, delay: index * 0.1 });
    playTone({ frequency: frequency * 1.5, duration: 0.18, type: "triangle", gain: 0.032, delay: index * 0.1 + 0.04 });
  });
}

function createSparkles(count) {
  const colors = ["#ffffff", "#ffd94a", "#26d9ff", "#ff4fa3", "#65f7b4"];

  for (let i = 0; i < count; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${randomBetween(8, 92)}vw`;
    sparkle.style.top = `${randomBetween(25, 86)}vh`;
    sparkle.style.color = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.animationDelay = `${randomBetween(0, 0.3)}s`;
    sparkle.style.transform = `scale(${randomBetween(0.5, 1.25)})`;
    sparkleLayer.appendChild(sparkle);
    sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
  }
}

function createConfetti(count) {
  const colors = ["#ff247f", "#ffd94a", "#26d9ff", "#65f7b4", "#7e5cff", "#ffffff"];

  for (let i = 0; i < count; i += 1) {
    const confetti = document.createElement("span");
    confetti.className = "confetti";
    confetti.style.left = `${randomBetween(0, 100)}vw`;
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${randomBetween(0, 0.8)}s`;
    confetti.style.setProperty("--drift", `${randomBetween(-90, 90)}px`);
    confettiLayer.appendChild(confetti);
    confetti.addEventListener("animationend", () => confetti.remove(), { once: true });
  }
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function resetResultEffects() {
  resultPanel.classList.remove("big-win", "jackpot-text");
  appShell.classList.remove("flash", "shake");
  sparkleLayer.replaceChildren();
  confettiLayer.replaceChildren();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAngle(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function lightenColor(hex, percent) {
  return shiftColor(hex, percent);
}

function darkenColor(hex, percent) {
  return shiftColor(hex, -percent);
}

function shiftColor(hex, percent) {
  const value = hex.replace("#", "");
  const amount = Math.round(2.55 * percent);
  const r = clamp(parseInt(value.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(value.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(value.slice(4, 6), 16) + amount, 0, 255);

  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resizeCanvasForDpr() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.max(320, Math.round(rect.width * dpr));

  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
    drawRoulette();
  }
}

spinButton.addEventListener("click", startSpin);
window.addEventListener("resize", resizeCanvasForDpr);

setupSegments();
renderStats();
resizeCanvasForDpr();
drawRoulette();

// 電飾だけは停止中もゆっくり光らせ、ゲームセンターらしい待機感を出す。
function idleLightsLoop() {
  if (!isSpinning) {
    drawRoulette();
  }
  requestAnimationFrame(idleLightsLoop);
}

requestAnimationFrame(idleLightsLoop);
