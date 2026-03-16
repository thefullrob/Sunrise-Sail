const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const conditionsEl = document.getElementById("conditions");
const dayNameEl = document.getElementById("day-name");
const timeDisplayEl = document.getElementById("time-display");
const speedDisplayEl = document.getElementById("speed-display");
const headingDisplayEl = document.getElementById("heading-display");
const messageOverlayEl = document.getElementById("message-overlay");
const messageTitleEl = document.getElementById("message-title");
const messageBodyEl = document.getElementById("message-body");
const captainNameEl = document.getElementById("captain-name");
const boatNameEl = document.getElementById("boat-name");
const challengeTitleEl = document.getElementById("challenge-title");
const challengeBodyEl = document.getElementById("challenge-body");
const shareButtonEl = document.getElementById("share-button");
const sharePanelEl = document.getElementById("share-panel");
const sharePreviewEl = document.getElementById("share-preview");

const days = [
  {
    name: "Harbor Dash",
    windMph: 15,
    windAngle: -35,
    tempF: 40,
    waveText: "Choppy",
    current: 0.8,
    hazards: [
      { x: 230, y: 620, r: 80 },
      { x: 670, y: 930, r: 90 },
    ],
  },
  {
    name: "Channel Sprint",
    windMph: 11,
    windAngle: 25,
    tempF: 52,
    waveText: "Light Swell",
    current: 1.1,
    hazards: [
      { x: 480, y: 520, r: 100 },
      { x: 310, y: 990, r: 70 },
    ],
  },
  {
    name: "Cold Front Run",
    windMph: 19,
    windAngle: -70,
    tempF: 36,
    waveText: "Rough",
    current: 1.4,
    hazards: [
      { x: 210, y: 710, r: 70 },
      { x: 710, y: 810, r: 100 },
    ],
  },
];

const markers = [
  { x: 180, y: 1040, r: 22 },
  { x: 720, y: 700, r: 22 },
  { x: 250, y: 340, r: 22 },
];

const finishLine = { y: 120, x1: 180, x2: 720 };

let currentDayIndex = 0;
let animationId = 0;
let lastFrame = 0;
let elapsedMs = 0;
let isFinished = false;
let lastResult = null;
let activeChallenge = null;

const boat = {
  x: 450,
  y: 1260,
  angle: -Math.PI / 2,
  speed: 0,
  trimBoost: 0,
};

let markerHits = markers.map(() => false);
const controls = {
  left: false,
  right: false,
  trim: false,
};

const profile = {
  captain: "",
  boat: "",
};

function resetBoat() {
  boat.x = 450;
  boat.y = 1260;
  boat.angle = -Math.PI / 2;
  boat.speed = 0;
  boat.trimBoost = 0;
  markerHits = markers.map(() => false);
  elapsedMs = 0;
  isFinished = false;
  lastResult = null;
  messageOverlayEl.classList.add("hidden");
  updateShareButton();
}

function getCurrentDay() {
  return days[currentDayIndex];
}

function renderConditions() {
  const day = getCurrentDay();
  dayNameEl.textContent = day.name;
  conditionsEl.innerHTML = "";

  const items = [
    { label: "Wind", value: `${day.windMph} mph` },
    { label: "Temp", value: `${day.tempF}F` },
    { label: "Waves", value: day.waveText },
    { label: "Current", value: `${day.current.toFixed(1)} kt` },
  ];

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "condition";
    div.innerHTML = `<span class="label">${item.label}</span><strong>${item.value}</strong>`;
    conditionsEl.appendChild(div);
  });
}

function getCaptainName() {
  return profile.captain || "Skipper";
}

function getBoatName() {
  return profile.boat || "Morning Star";
}

function updateHud() {
  timeDisplayEl.textContent = formatTime(elapsedMs);
  speedDisplayEl.textContent = `${boat.speed.toFixed(1)} kt`;
  let heading = ((boat.angle * 180) / Math.PI + 90) % 360;
  if (heading < 0) heading += 360;
  headingDisplayEl.textContent = `${Math.round(heading)} deg`;
  renderChallengePanel();
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}

function windEfficiency(relativeAngle) {
  const absAngle = Math.abs(relativeAngle);
  if (absAngle < 0.55) return 0.15;
  if (absAngle < 1.0) return 0.45;
  if (absAngle < 2.3) return 1.0;
  return 0.72;
}

function updateBoat(dt) {
  if (isFinished) return;

  if (controls.left) boat.angle -= 2.2 * dt;
  if (controls.right) boat.angle += 2.2 * dt;
  boat.trimBoost = controls.trim ? 0.18 : 0;

  const day = getCurrentDay();
  const windAngle = (day.windAngle * Math.PI) / 180 - Math.PI / 2;
  const relativeWind = normalizeAngle(boat.angle - windAngle);
  const efficiency = windEfficiency(relativeWind);
  const targetSpeed = day.windMph * 0.34 * efficiency + boat.trimBoost;
  boat.speed += (targetSpeed - boat.speed) * Math.min(1, dt * 2.5);

  const wavePenalty = day.waveText === "Rough" ? 0.82 : day.waveText === "Choppy" ? 0.9 : 0.96;
  const currentPushX = Math.sin(Math.PI / 7) * day.current * 8;
  const currentPushY = -day.current * 10;

  boat.x += Math.cos(boat.angle) * boat.speed * 22 * wavePenalty * dt + currentPushX * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * 22 * wavePenalty * dt + currentPushY * dt;

  boat.x = Math.max(60, Math.min(canvas.width - 60, boat.x));
  boat.y = Math.max(70, Math.min(canvas.height - 70, boat.y));

  markerHits = markerHits.map((hit, index) => {
    if (hit) return true;
    return distance(boat.x, boat.y, markers[index].x, markers[index].y) < 44;
  });

  if (touchesHazard()) {
    boat.speed *= 0.4;
  }

  if (allMarkersHit() && boat.y <= finishLine.y + 18 && boat.x >= finishLine.x1 && boat.x <= finishLine.x2) {
    isFinished = true;
    lastResult = {
      dayIndex: currentDayIndex,
      timeMs: Math.round(elapsedMs),
      captain: getCaptainName(),
      boat: getBoatName(),
    };
    updateShareButton();
    showFinishMessage();
  }
}

function renderChallengePanel() {
  if (activeChallenge) {
    const targetSeconds = activeChallenge.timeMs / 1000;
    const currentSeconds = elapsedMs / 1000;
    const delta = currentSeconds - targetSeconds;
    const deltaText = delta <= 0
      ? `${Math.abs(delta).toFixed(1)}s ahead`
      : `${delta.toFixed(1)}s behind`;

    challengeTitleEl.textContent = `${activeChallenge.captain} on ${activeChallenge.boat}`;
    challengeBodyEl.textContent = `Beat ${formatTime(activeChallenge.timeMs)} on ${days[activeChallenge.dayIndex].name}. Right now you are ${deltaText}.`;
    return;
  }

  challengeTitleEl.textContent = "Solo Run";
  challengeBodyEl.textContent = "Set a time, then share it with a friend.";
}

function updateShareButton() {
  shareButtonEl.disabled = !lastResult;
  sharePanelEl.classList.toggle("hidden", !lastResult);
  sharePreviewEl.textContent = lastResult ? buildShareText("preview") : "";
}

function touchesHazard() {
  return getCurrentDay().hazards.some((hazard) => distance(boat.x, boat.y, hazard.x, hazard.y) < hazard.r);
}

function allMarkersHit() {
  return markerHits.every(Boolean);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWater();
  drawCourse();
  drawBoat();
}

function drawWater() {
  ctx.save();
  for (let i = 0; i < 15; i += 1) {
    const y = 95 + i * 92;
    const alpha = 0.1 + i * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.quadraticCurveTo(x + 20, y + 16, x + 40, y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  const sunGlow = ctx.createRadialGradient(450, 40, 10, 450, 40, 160);
  sunGlow.addColorStop(0, "rgba(255, 242, 185, 0.6)");
  sunGlow.addColorStop(1, "rgba(255, 242, 185, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(450, 40, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCourse() {
  const day = getCurrentDay();

  ctx.save();
  day.hazards.forEach((hazard) => {
    const shoal = ctx.createRadialGradient(hazard.x, hazard.y, 10, hazard.x, hazard.y, hazard.r);
    shoal.addColorStop(0, "rgba(185, 177, 163, 0.6)");
    shoal.addColorStop(1, "rgba(185, 177, 163, 0.18)");
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fillStyle = shoal;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(190, 63, 30, 0.7)";
    ctx.stroke();

    ctx.fillStyle = "rgba(132, 86, 53, 0.65)";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.fillText("Shoal", hazard.x - 28, hazard.y + 6);
  });

  markers.forEach((marker, index) => {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marker.x, marker.y - 60);
    ctx.lineTo(marker.x, marker.y - marker.r);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.r, 0, Math.PI * 2);
    ctx.fillStyle = markerHits[index] ? "#ffd45a" : "#fff7e0";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#d67b16";
    ctx.stroke();

    ctx.fillStyle = "rgba(23, 50, 77, 0.72)";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(`${index + 1}`, marker.x - 5, marker.y + 6);
  });

  const finishWidth = finishLine.x2 - finishLine.x1;
  const segmentWidth = finishWidth / 10;
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(finishLine.x1 + i * segmentWidth, finishLine.y);
    ctx.lineTo(finishLine.x1 + (i + 1) * segmentWidth, finishLine.y);
    ctx.lineWidth = 10;
    ctx.strokeStyle = i % 2 === 0 ? "#f8fbff" : "#244a65";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = "rgba(23, 50, 77, 0.75)";
  ctx.font = "bold 28px Trebuchet MS";
  ctx.fillText("Finish", finishLine.x1 + 220, finishLine.y - 16);

  drawWindArrow(day.windAngle);
  ctx.restore();
}

function drawWindArrow(windAngleDegrees) {
  const angle = (windAngleDegrees * Math.PI) / 180;
  const startX = 120;
  const startY = 120;
  const length = 110;
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;

  ctx.strokeStyle = "rgba(23, 50, 77, 0.7)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 18 * Math.cos(angle - 0.45), endY - 18 * Math.sin(angle - 0.45));
  ctx.lineTo(endX - 18 * Math.cos(angle + 0.45), endY - 18 * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fillStyle = "rgba(23, 50, 77, 0.7)";
  ctx.fill();

  ctx.fillStyle = "rgba(23, 50, 77, 0.8)";
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("Wind", startX - 10, startY - 22);
}

function drawBoat() {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.angle + Math.PI / 2);

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 28);
  ctx.quadraticCurveTo(0, 54, -14, 74);
  ctx.moveTo(0, 28);
  ctx.quadraticCurveTo(0, 54, 14, 74);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#f8f2e7";
  ctx.strokeStyle = "#254760";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.bezierCurveTo(18, -50, 28, -18, 26, 20);
  ctx.bezierCurveTo(24, 46, 14, 66, 0, 72);
  ctx.bezierCurveTo(-14, 66, -24, 46, -26, 20);
  ctx.bezierCurveTo(-28, -18, -18, -50, 0, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#2a5775";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(0, 42);
  ctx.stroke();

  ctx.fillStyle = "#ff7a45";
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(0, 14);
  ctx.lineTo(28, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fffaf5";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, 28);
  ctx.lineTo(-16, 14);
  ctx.lineTo(-16, -10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#254760";
  ctx.beginPath();
  ctx.arc(0, 24, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-10, 60);
  ctx.lineTo(10, 60);
  ctx.lineTo(0, 72);
  ctx.closePath();
  ctx.fillStyle = "#17324d";
  ctx.fill();

  ctx.restore();
}

function loop(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const dt = Math.min(0.032, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;

  if (!isFinished) elapsedMs += dt * 1000;

  updateBoat(dt);
  updateHud();
  draw();
  animationId = requestAnimationFrame(loop);
}

function showMessage(title, body) {
  messageTitleEl.textContent = title;
  messageBodyEl.textContent = body;
  messageOverlayEl.classList.remove("hidden");
}

function showFinishMessage() {
  if (!lastResult) return;

  if (activeChallenge) {
    const beatTime = lastResult.timeMs < activeChallenge.timeMs;
    const margin = Math.abs(lastResult.timeMs - activeChallenge.timeMs);
    const resultLine = beatTime
      ? `You beat ${activeChallenge.captain}'s time by ${formatTime(margin)}.`
      : `You missed ${activeChallenge.captain}'s time by ${formatTime(margin)}.`;
    showMessage(
      "Finish!",
      `${lastResult.captain} on ${lastResult.boat} finished ${getCurrentDay().name} in ${formatTime(lastResult.timeMs)}. ${resultLine}`
    );
    return;
  }

  showMessage(
    "Finish!",
    `${lastResult.captain} on ${lastResult.boat} completed ${getCurrentDay().name} in ${formatTime(lastResult.timeMs)}.`
  );
}

function saveProfile() {
  profile.captain = captainNameEl.value.trim();
  profile.boat = boatNameEl.value.trim();

  localStorage.setItem("sunrise-sail-captain", profile.captain);
  localStorage.setItem("sunrise-sail-boat", profile.boat);
  renderChallengePanel();
}

function loadProfile() {
  profile.captain = localStorage.getItem("sunrise-sail-captain") || "";
  profile.boat = localStorage.getItem("sunrise-sail-boat") || "";
  captainNameEl.value = profile.captain;
  boatNameEl.value = profile.boat;
}

function buildShareUrl() {
  if (!lastResult) return window.location.href.split("?")[0];

  const url = new URL(window.location.href);
  url.searchParams.set("day", String(lastResult.dayIndex));
  url.searchParams.set("time", String(lastResult.timeMs));
  url.searchParams.set("captain", lastResult.captain);
  url.searchParams.set("boat", lastResult.boat);
  return url.toString();
}

function buildShareTitle() {
  if (!lastResult) return "Sunrise Sail Challenge";
  return `Sunrise Sail - ${days[lastResult.dayIndex].name}`;
}

function buildShareRows() {
  if (!lastResult) return [];

  const day = days[lastResult.dayIndex];
  return [
    "SUNRISE SAIL",
    `${day.name}`,
    `${lastResult.captain} aboard ${lastResult.boat}`,
    "",
    `TIME   ${formatTime(lastResult.timeMs)}`,
    `WIND   ${day.windMph} mph`,
    `WAVES  ${day.waveText}`,
    `TIDE   ${day.current.toFixed(1)} kt`,
    "",
    "Can you beat this line?",
  ];
}

function buildShareText(mode = "web") {
  if (!lastResult) return "Race my Sunrise Sail time.";

  const rows = buildShareRows();
  if (mode === "preview") {
    return rows.join("\n");
  }

  const summary = `${lastResult.captain} aboard ${lastResult.boat} sailed ${days[lastResult.dayIndex].name} in ${formatTime(lastResult.timeMs)}.`;
  if (mode === "clipboard") {
    return `${rows.join("\n")}\n\nRace this run:\n${buildShareUrl()}`;
  }
  return `${summary}\n\nCan you beat this line?`;
}

function drawShareCard() {
  if (!lastResult) return null;

  const day = days[lastResult.dayIndex];
  const shareCanvas = document.createElement("canvas");
  shareCanvas.width = 1200;
  shareCanvas.height = 630;
  const shareCtx = shareCanvas.getContext("2d");

  const bg = shareCtx.createLinearGradient(0, 0, 0, 630);
  bg.addColorStop(0, "#f7c66b");
  bg.addColorStop(0.38, "#8fd5db");
  bg.addColorStop(1, "#347f9d");
  shareCtx.fillStyle = bg;
  shareCtx.fillRect(0, 0, 1200, 630);

  const glow = shareCtx.createRadialGradient(920, 70, 20, 920, 70, 220);
  glow.addColorStop(0, "rgba(255, 245, 197, 0.92)");
  glow.addColorStop(1, "rgba(255, 245, 197, 0)");
  shareCtx.fillStyle = glow;
  shareCtx.beginPath();
  shareCtx.arc(920, 70, 220, 0, Math.PI * 2);
  shareCtx.fill();

  shareCtx.fillStyle = "rgba(252, 248, 239, 0.9)";
  roundRect(shareCtx, 40, 40, 1120, 550, 34);
  shareCtx.fill();

  const panelGradient = shareCtx.createLinearGradient(430, 70, 430, 560);
  panelGradient.addColorStop(0, "#dff3f1");
  panelGradient.addColorStop(1, "#4f99ad");
  shareCtx.fillStyle = panelGradient;
  roundRect(shareCtx, 420, 70, 700, 490, 26);
  shareCtx.fill();

  shareCtx.save();
  shareCtx.beginPath();
  roundRect(shareCtx, 420, 70, 700, 490, 26);
  shareCtx.clip();
  for (let i = 0; i < 8; i += 1) {
    const y = 120 + i * 58;
    shareCtx.beginPath();
    shareCtx.moveTo(420, y);
    for (let x = 420; x <= 1120; x += 36) {
      shareCtx.quadraticCurveTo(x + 18, y + 12, x + 36, y);
    }
    shareCtx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    shareCtx.lineWidth = 4;
    shareCtx.stroke();
  }
  shareCtx.restore();

  shareCtx.fillStyle = "#17324d";
  shareCtx.font = "700 26px Trebuchet MS";
  shareCtx.fillText("DAILY SAILING SPRINT", 86, 120);
  shareCtx.font = "700 70px Trebuchet MS";
  shareCtx.fillText("Sunrise Sail", 82, 190);

  shareCtx.fillStyle = "#5d7182";
  shareCtx.font = "600 28px Trebuchet MS";
  shareCtx.fillText(day.name, 86, 240);
  shareCtx.fillText(`${lastResult.captain} aboard ${lastResult.boat}`, 86, 280);

  shareCtx.fillStyle = "#ff7a45";
  roundRect(shareCtx, 82, 330, 270, 112, 24);
  shareCtx.fill();
  shareCtx.fillStyle = "#ffffff";
  shareCtx.font = "700 24px Trebuchet MS";
  shareCtx.fillText("FINISH TIME", 110, 372);
  shareCtx.font = "700 54px Trebuchet MS";
  shareCtx.fillText(formatTime(lastResult.timeMs), 108, 426);

  shareCtx.fillStyle = "rgba(23, 50, 77, 0.08)";
  roundRect(shareCtx, 82, 466, 290, 82, 20);
  shareCtx.fill();
  shareCtx.fillStyle = "#17324d";
  shareCtx.font = "700 22px Trebuchet MS";
  shareCtx.fillText(`Wind ${day.windMph} mph`, 110, 500);
  shareCtx.fillText(`Waves ${day.waveText}`, 110, 530);

  drawShareBoat(shareCtx, 605, 365, 1.5);

  shareCtx.strokeStyle = "rgba(248, 251, 255, 0.95)";
  shareCtx.lineWidth = 10;
  for (let i = 0; i < 8; i += 1) {
    shareCtx.beginPath();
    shareCtx.moveTo(760 + i * 34, 140);
    shareCtx.lineTo(786 + i * 34, 140);
    shareCtx.strokeStyle = i % 2 === 0 ? "#f8fbff" : "#244a65";
    shareCtx.stroke();
  }
  shareCtx.fillStyle = "rgba(23, 50, 77, 0.8)";
  shareCtx.font = "700 30px Trebuchet MS";
  shareCtx.fillText("Beat this line", 800, 112);

  return shareCanvas;
}

function roundRect(drawCtx, x, y, width, height, radius) {
  drawCtx.beginPath();
  drawCtx.moveTo(x + radius, y);
  drawCtx.lineTo(x + width - radius, y);
  drawCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
  drawCtx.lineTo(x + width, y + height - radius);
  drawCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  drawCtx.lineTo(x + radius, y + height);
  drawCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
  drawCtx.lineTo(x, y + radius);
  drawCtx.quadraticCurveTo(x, y, x + radius, y);
  drawCtx.closePath();
}

function drawShareBoat(drawCtx, x, y, scale) {
  drawCtx.save();
  drawCtx.translate(x, y);
  drawCtx.scale(scale, scale);
  drawCtx.rotate(-0.35);

  drawCtx.globalAlpha = 0.18;
  drawCtx.strokeStyle = "#ffffff";
  drawCtx.lineWidth = 5;
  drawCtx.beginPath();
  drawCtx.moveTo(0, 28);
  drawCtx.quadraticCurveTo(0, 54, -14, 74);
  drawCtx.moveTo(0, 28);
  drawCtx.quadraticCurveTo(0, 54, 14, 74);
  drawCtx.stroke();
  drawCtx.globalAlpha = 1;

  drawCtx.fillStyle = "#f8f2e7";
  drawCtx.strokeStyle = "#254760";
  drawCtx.lineWidth = 3;
  drawCtx.beginPath();
  drawCtx.moveTo(0, -58);
  drawCtx.bezierCurveTo(18, -50, 28, -18, 26, 20);
  drawCtx.bezierCurveTo(24, 46, 14, 66, 0, 72);
  drawCtx.bezierCurveTo(-14, 66, -24, 46, -26, 20);
  drawCtx.bezierCurveTo(-28, -18, -18, -50, 0, -58);
  drawCtx.closePath();
  drawCtx.fill();
  drawCtx.stroke();

  drawCtx.strokeStyle = "#2a5775";
  drawCtx.lineWidth = 4;
  drawCtx.beginPath();
  drawCtx.moveTo(0, -44);
  drawCtx.lineTo(0, 42);
  drawCtx.stroke();

  drawCtx.fillStyle = "#ff7a45";
  drawCtx.beginPath();
  drawCtx.moveTo(0, -34);
  drawCtx.lineTo(0, 14);
  drawCtx.lineTo(28, 6);
  drawCtx.closePath();
  drawCtx.fill();

  drawCtx.fillStyle = "#fffaf5";
  drawCtx.beginPath();
  drawCtx.moveTo(0, -30);
  drawCtx.lineTo(0, 28);
  drawCtx.lineTo(-16, 14);
  drawCtx.lineTo(-16, -10);
  drawCtx.closePath();
  drawCtx.fill();
  drawCtx.restore();
}

async function canvasToFile(cardCanvas) {
  if (!cardCanvas || !cardCanvas.toBlob) return null;
  return new Promise((resolve) => {
    cardCanvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], "sunrise-sail-share.png", { type: "image/png" }));
    }, "image/png");
  });
}

async function shareChallenge() {
  if (!lastResult) return;

  const cardCanvas = drawShareCard();
  const imageFile = await canvasToFile(cardCanvas);
  const shareData = {
    title: buildShareTitle(),
    text: buildShareText("web"),
    url: buildShareUrl(),
  };
  const shareWithFile = imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })
    ? { ...shareData, files: [imageFile] }
    : null;

  if (navigator.share) {
    try {
      await navigator.share(shareWithFile || shareData);
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }

  const fallbackText = buildShareText("clipboard");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(fallbackText);
    showMessage("Copied!", "Your challenge link and result text were copied to the clipboard.");
    return;
  }

  showMessage("Share This", fallbackText);
}

function loadChallengeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dayIndex = Number(params.get("day"));
  const timeMs = Number(params.get("time"));
  const captain = (params.get("captain") || "").trim();
  const boatName = (params.get("boat") || "").trim();

  if (
    Number.isNaN(dayIndex) ||
    Number.isNaN(timeMs) ||
    dayIndex < 0 ||
    dayIndex >= days.length ||
    timeMs <= 0
  ) {
    activeChallenge = null;
    return;
  }

  activeChallenge = {
    dayIndex,
    timeMs,
    captain: captain || "Skipper",
    boat: boatName || "Morning Star",
  };
  currentDayIndex = dayIndex;
}

function bindButton(id, key) {
  const button = document.getElementById(id);
  const activate = (event) => {
    event.preventDefault();
    controls[key] = true;
  };
  const deactivate = (event) => {
    event.preventDefault();
    controls[key] = false;
  };

  button.addEventListener("pointerdown", activate);
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("pointercancel", deactivate);
}

function startNewDay(nextIndex = currentDayIndex) {
  currentDayIndex = nextIndex;
  resetBoat();
  renderConditions();
  updateHud();
}

document.getElementById("new-day-button").addEventListener("click", () => {
  activeChallenge = null;
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url);
  startNewDay((currentDayIndex + 1) % days.length);
});

document.getElementById("restart-button").addEventListener("click", () => {
  startNewDay(currentDayIndex);
});

captainNameEl.addEventListener("input", saveProfile);
boatNameEl.addEventListener("input", saveProfile);
shareButtonEl.addEventListener("click", () => {
  shareChallenge().catch(() => {
    showMessage("Share This", `${buildShareText()} ${buildShareUrl()}`);
  });
});

bindButton("left-button", "left");
bindButton("right-button", "right");
bindButton("boost-button", "trim");

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") controls.left = true;
  if (event.key === "ArrowRight") controls.right = true;
  if (event.key === " ") controls.trim = true;
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") controls.left = false;
  if (event.key === "ArrowRight") controls.right = false;
  if (event.key === " ") controls.trim = false;
});

loadProfile();
loadChallengeFromUrl();
startNewDay(currentDayIndex);
updateShareButton();
animationId = requestAnimationFrame(loop);
