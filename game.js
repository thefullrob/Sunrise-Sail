const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const conditionsEl = document.getElementById("conditions");
const gamePanelEl = document.querySelector(".game-panel");
const dayNameEl = document.getElementById("day-name");
const timeDisplayEl = document.getElementById("time-display");
const speedDisplayEl = document.getElementById("speed-display");
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
const hudDrawerEl = document.getElementById("hud-drawer");
const trimFillEl = document.getElementById("trim-fill");
const bgMusicEl = document.getElementById("bg-music");
const musicButtonEl = document.getElementById("music-button");
const canvasShellEl = document.querySelector(".canvas-shell");
const expandButtonEl = document.getElementById("expand-button");
const startOverlayEl = document.getElementById("start-overlay");
const startTitleEl = document.getElementById("start-title");
const startBodyEl = document.getElementById("start-body");
const startButtonEl = document.getElementById("start-button");

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
const phoneLayoutQuery = window.matchMedia("(max-width: 430px)");

let currentDayIndex = 0;
let animationId = 0;
let lastFrame = 0;
let elapsedMs = 0;
let isFinished = false;
let raceStarted = false;
let lastResult = null;
let activeChallenge = null;
let trafficSpawnTimer = 0;
let trafficSeed = 0;
let skierSpawnTimer = 0;

const boat = {
  x: 450,
  y: 1260,
  angle: -Math.PI / 2,
  speed: 0,
  trimBoost: 0,
  trimEnergy: 1,
};

let markerHits = markers.map(() => false);
const controls = {
  left: false,
  right: false,
  trim: false,
  steer: 0,
};

const swipeSteering = {
  pointerId: null,
  startX: 0,
};

const profile = {
  captain: "",
  boat: "",
};

const audioState = {
  enabled: true,
  unlocked: false,
};

const fullscreenState = {
  mode: "normal",
  scrollY: 0,
};

let hudDrawerInitialized = false;

const trafficTypes = [
  { name: "Tug", color: "#d07b39", hull: "#23415c", speed: [32, 48], size: 0.95, asset: "tug" },
  { name: "Jet Ski", color: "#f46036", hull: "#17324d", speed: [48, 68], size: 0.7, asset: "jetski" },
  { name: "Wind Surfer", color: "#ffd166", hull: "#1f5d7a", speed: [36, 56], size: 0.78, asset: "windsurfer" },
  { name: "Cruise", color: "#f8f4ef", hull: "#567892", speed: [24, 34], size: 1.12, asset: "cruise" },
  { name: "Skier", color: "#8ecae6", hull: "#264653", speed: [42, 58], size: 0.9, asset: "skiboat" },
];

const trafficBoats = [];
const art = loadArtAssets();

function loadArtAssets() {
  const sources = {
    sailboat: "Gemini_Generated_Image_kul775kul775kul7.png",
    tug: "Gemini_Generated_Image_a6ws3oa6ws3oa6ws.png",
    cruise: "Gemini_Generated_Image_aq9lwzaq9lwzaq9l.png",
    windsurfer: "Gemini_Generated_Image_51zygp51zygp51zy.png",
    jetski: "jetski.png",
    skiboat: "ski boat.png",
    shoal: "shoal.png",
    marker: "marker v3.png",
  };

  return Object.fromEntries(
    Object.entries(sources).map(([key, src]) => {
      const image = new Image();
      image.src = src;
      return [key, image];
    })
  );
}

function resetBoat() {
  boat.x = isPhoneLayout() ? 330 : 400;
  boat.y = isPhoneLayout() ? 1210 : 1230;
  boat.angle = -Math.PI / 2;
  boat.speed = 0;
  boat.trimBoost = 0;
  boat.trimEnergy = 1;
  markerHits = markers.map(() => false);
  elapsedMs = 0;
  isFinished = false;
  raceStarted = false;
  lastResult = null;
  releaseSwipeSteering();
  trafficBoats.length = 0;
  trafficSpawnTimer = 2.4;
  trafficSeed = (trafficSeed + 1) % 1000;
  skierSpawnTimer = 11.5;
  messageOverlayEl.classList.add("hidden");
  updateStartOverlay();
  updateShareButton();
  updateTrimButton();
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
    { label: "Waves", value: day.waveText },
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
  const formattedTime = formatTime(elapsedMs);
  timeDisplayEl.textContent = formattedTime;
  speedDisplayEl.textContent = `${boat.speed.toFixed(1)} kt`;
  renderChallengePanel();
}

function getBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function supportsElementFullscreen() {
  return typeof gamePanelEl.requestFullscreen === "function" || typeof gamePanelEl.webkitRequestFullscreen === "function";
}

function lockPageScroll() {
  if (document.body.classList.contains("expanded-active")) return;
  fullscreenState.scrollY = window.scrollY;
  document.body.style.top = `-${fullscreenState.scrollY}px`;
  document.body.classList.add("expanded-active");
}

function unlockPageScroll() {
  const scrollY = fullscreenState.scrollY;
  document.body.classList.remove("expanded-active");
  document.body.style.top = "";
  window.scrollTo(0, scrollY);
}

function updateExpandButton() {
  const expanded = fullscreenState.mode !== "normal";
  expandButtonEl.textContent = expanded ? (fullscreenState.mode === "fullscreen" ? "Exit Fullscreen" : "Exit Expanded") : "Expand";
  expandButtonEl.setAttribute("aria-pressed", expanded ? "true" : "false");
}

function syncExpandedState() {
  const expanded = fullscreenState.mode !== "normal";
  gamePanelEl.classList.toggle("expanded-panel", expanded);
  document.body.classList.toggle("immersive-active", fullscreenState.mode === "immersive");
  document.body.classList.toggle("real-fullscreen-active", fullscreenState.mode === "fullscreen");

  if (expanded) {
    lockPageScroll();
  } else {
    unlockPageScroll();
  }

  updateExpandButton();
}

async function requestPanelFullscreen() {
  if (typeof gamePanelEl.requestFullscreen === "function") {
    return gamePanelEl.requestFullscreen();
  }
  if (typeof gamePanelEl.webkitRequestFullscreen === "function") {
    return gamePanelEl.webkitRequestFullscreen();
  }
  throw new Error("Fullscreen not supported");
}

async function exitPanelFullscreen() {
  if (typeof document.exitFullscreen === "function") {
    return document.exitFullscreen();
  }
  if (typeof document.webkitExitFullscreen === "function") {
    return document.webkitExitFullscreen();
  }
}

async function enterExpandedMode() {
  if (supportsElementFullscreen()) {
    try {
      await requestPanelFullscreen();
      fullscreenState.mode = "fullscreen";
      syncExpandedState();
      return;
    } catch (error) {
      // Fall back to immersive mode when the browser rejects element fullscreen.
    }
  }

  fullscreenState.mode = "immersive";
  syncExpandedState();
}

async function exitExpandedMode() {
  if (fullscreenState.mode === "fullscreen" && getFullscreenElement()) {
    try {
      await exitPanelFullscreen();
    } finally {
      fullscreenState.mode = "normal";
      syncExpandedState();
    }
    return;
  }

  fullscreenState.mode = "normal";
  syncExpandedState();
}

function handleFullscreenChange() {
  const activeElement = getFullscreenElement();
  if (activeElement === gamePanelEl) {
    fullscreenState.mode = "fullscreen";
    syncExpandedState();
    return;
  }

  if (fullscreenState.mode === "fullscreen") {
    fullscreenState.mode = "normal";
    syncExpandedState();
  }
}

function toggleExpandedMode() {
  if (fullscreenState.mode === "normal") {
    enterExpandedMode().catch(() => {
      fullscreenState.mode = "immersive";
      syncExpandedState();
    });
    return;
  }

  exitExpandedMode().catch(() => {
    fullscreenState.mode = "normal";
    syncExpandedState();
  });
}

function windEfficiency(relativeAngle) {
  const absAngle = Math.abs(relativeAngle);
  if (absAngle < 0.55) return 0.15;
  if (absAngle < 1.0) return 0.45;
  if (absAngle < 2.3) return 1.0;
  return 0.72;
}

function trimEfficiency(relativeAngle) {
  const absAngle = Math.abs(relativeAngle);
  if (absAngle < 0.7) return 0;
  if (absAngle < 1.0) return 0.35;
  if (absAngle < 1.95) return 1.0;
  if (absAngle < 2.45) return 0.55;
  return 0.2;
}

function updateTrimButton() {
  trimFillEl.style.transform = `scaleY(${boat.trimEnergy.toFixed(3)})`;
  trimFillEl.style.opacity = boat.trimEnergy > 0.02 ? "1" : "0.25";
}

function updateBoat(dt) {
  if (isFinished || !raceStarted) return;

  const steerInput = Math.max(-1, Math.min(1, controls.steer + (controls.right ? 1 : 0) - (controls.left ? 1 : 0)));
  boat.angle += steerInput * 2.2 * dt;

  const day = getCurrentDay();
  const windAngle = (day.windAngle * Math.PI) / 180 - Math.PI / 2;
  const relativeWind = normalizeAngle(boat.angle - windAngle);
  const efficiency = windEfficiency(relativeWind);
  const trimWindow = trimEfficiency(relativeWind);
  const usingTrim = controls.trim && boat.trimEnergy > 0.02;
  if (usingTrim) {
    boat.trimEnergy = Math.max(0, boat.trimEnergy - dt / 3.2);
  } else {
    boat.trimEnergy = Math.min(1, boat.trimEnergy + dt / 5.6);
  }

  const trimPower = usingTrim ? trimWindow * (0.32 + boat.trimEnergy * 0.28) : 0;
  boat.trimBoost += (trimPower - boat.trimBoost) * Math.min(1, dt * 6);
  const targetSpeed = day.windMph * 0.34 * efficiency + boat.trimBoost;
  boat.speed += (targetSpeed - boat.speed) * Math.min(1, dt * 2.5);
  updateTrimButton();

  const wavePenalty = day.waveText === "Rough" ? 0.82 : day.waveText === "Choppy" ? 0.9 : 0.96;
  const currentPushX = Math.sin(Math.PI / 7) * day.current * 8;
  const currentPushY = -day.current * 10;

  boat.x += Math.cos(boat.angle) * boat.speed * 22 * wavePenalty * dt + currentPushX * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * 22 * wavePenalty * dt + currentPushY * dt;

  boat.x = Math.max(60, Math.min(canvas.width - 60, boat.x));
  boat.y = Math.max(70, Math.min(canvas.height - 70, boat.y));
  keepBoatOutOfControlZone();

  markerHits = markerHits.map((hit, index) => {
    if (hit) return true;
    return distance(boat.x, boat.y, markers[index].x, markers[index].y) < 54;
  });

  if (touchesHazard()) {
    boat.speed *= 0.4;
  }

  updateTraffic(dt);
  if (touchesTraffic()) {
    isFinished = true;
    raceStarted = false;
    showCrashMessage();
    return;
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

function updateTraffic(dt) {
  trafficSpawnTimer -= dt;
  skierSpawnTimer -= dt;

  if (skierSpawnTimer <= 0 && !hasActiveSkier()) {
    spawnSkierBoat(trafficTypes.find((type) => type.name === "Skier"));
    skierSpawnTimer = 22;
  }

  if (trafficSpawnTimer <= 0) {
    spawnTrafficBoat();
    trafficSpawnTimer = 5.8 + ((trafficSeed % 3) * 0.9);
    trafficSeed += 1;
  }

  prepareTrafficTargets();
  applyTrafficSeparation();

  for (let index = trafficBoats.length - 1; index >= 0; index -= 1) {
    const traffic = trafficBoats[index];
    if (traffic.type.name === "Skier") {
      traffic.y += traffic.vy * dt;
      traffic.angle = Math.atan2(traffic.vy, 0);
      traffic.pathTime += dt;
      if (traffic.y < 160 || traffic.y > canvas.height - 120) {
        trafficBoats.splice(index, 1);
        continue;
      }
    } else {
      traffic.x += traffic.vx * dt;
      traffic.y += (traffic.targetY - traffic.y) * Math.min(1, dt * 2.6);
      traffic.angle = Math.atan2(traffic.targetY - traffic.y, traffic.vx);
    }

    if (traffic.x < -180 || traffic.x > canvas.width + 180 || traffic.y < -180 || traffic.y > canvas.height + 180) {
      trafficBoats.splice(index, 1);
    }
  }
}

function spawnTrafficBoat() {
  const type = trafficTypes[trafficSeed % trafficTypes.length];
  if (type.name === "Skier") {
    spawnSkierBoat(type);
    skierSpawnTimer = 22;
    return;
  }

  const fromLeft = trafficSeed % 2 === 0;
  const laneY = 220 + ((trafficSeed * 173) % 860);
  const speed = type.speed[0] + ((trafficSeed * 11) % Math.round(type.speed[1] - type.speed[0] + 1));
  const safeLaneY = findSafeTrafficLane(laneY, 28);
  if (!isTrafficLaneOpen(safeLaneY)) return;

  const vx = fromLeft ? speed : -speed;
  trafficBoats.push({
    type,
    x: fromLeft ? -130 : canvas.width + 130,
    y: safeLaneY,
    baseY: safeLaneY,
    targetY: safeLaneY,
    baseVx: vx,
    vx,
    vy: 0,
    angle: Math.atan2(0, vx),
    width: 76 * type.size,
    height: 30 * type.size,
    pathTime: 0,
  });
}

function touchesTraffic() {
  return trafficBoats.some((traffic) => distance(boat.x, boat.y, traffic.x, traffic.y) < 44 + traffic.width * 0.28);
}

function isPhoneLayout() {
  return phoneLayoutQuery.matches;
}

function getObjectScale() {
  return isPhoneLayout() ? 1.34 : 1;
}

function getBoardUiScale() {
  return isPhoneLayout() ? 1.08 : 1;
}

function getVesselScale() {
  return getObjectScale() * (fullscreenState.mode === "normal" ? 1.3 : 1.42);
}

function getControlZone() {
  if (fullscreenState.mode !== "normal") {
    if (isPhoneLayout()) {
      return {
        x: 612,
        y: 1024,
        width: 198,
        height: 198,
        padding: 34,
      };
    }

    return {
      x: 690,
      y: 1110,
      width: 150,
      height: 150,
      padding: 22,
    };
  }

  if (isPhoneLayout()) {
    return {
      x: 646,
      y: 1082,
      width: 164,
      height: 164,
      padding: 30,
    };
  }

  return {
    x: 724,
    y: 1178,
    width: 92,
    height: 92,
    padding: 18,
  };
}

function findSafeTrafficLane(preferredY, clearance) {
  const candidates = [preferredY, 260, 340, 430, 520, 620, 720, 820, 930, 1040];
  const hazards = getCurrentDay().hazards;

  for (const candidate of candidates) {
    const safe = hazards.every((hazard) => Math.abs(candidate - hazard.y) > hazard.r + clearance + 40) && isTrafficLaneOpen(candidate);
    if (safe) return candidate;
  }

  return preferredY;
}

function isTrafficLaneOpen(candidateY) {
  return trafficBoats.every((traffic) => traffic.type.name === "Skier" || Math.abs(traffic.y - candidateY) > 84);
}

function spawnSkierBoat(type) {
  const route = findSafeSkierLane();
  if (!route) return;

  const fromTop = trafficSeed % 2 === 0;
  const vy = fromTop ? 24 : -24;
  trafficBoats.push({
    type,
    x: route.x,
    y: fromTop ? 150 : canvas.height - 130,
    baseY: route.y,
    vy,
    angle: Math.atan2(vy, 0),
    width: 92 * type.size,
    height: 34 * type.size,
    pathTime: 0,
  });
}

function findSafeSkierLane() {
  const candidates = [
    { x: 170, y: 0 },
    { x: 320, y: 0 },
    { x: 580, y: 0 },
  ];

  for (const candidate of candidates) {
    if (skierLaneIsSafe(candidate.x)) return candidate;
  }

  return candidates[1];
}

function skierLaneIsSafe(x) {
  const hazards = getCurrentDay().hazards;
  if (markers.some((marker) => Math.abs(marker.x - x) < 72)) return false;
  if (hazards.some((hazard) => Math.abs(hazard.x - x) < hazard.r + 76)) return false;
  if (laneIntersectsControlZone(x)) return false;
  if (trafficBoats.some((traffic) => traffic.type.name === "Skier" || Math.abs(traffic.x - x) < 82)) return false;
  return true;
}

function getControlZoneBounds() {
  const controlZone = getControlZone();
  return {
    left: controlZone.x - controlZone.padding,
    top: controlZone.y - controlZone.padding,
    right: controlZone.x + controlZone.width + controlZone.padding,
    bottom: controlZone.y + controlZone.height + controlZone.padding,
  };
}

function laneIntersectsControlZone(x) {
  const zone = getControlZoneBounds();
  return x > zone.left - 60 && x < zone.right + 60;
}

function keepBoatOutOfControlZone() {
  const zone = getControlZoneBounds();
  const radius = 48;
  const insideX = boat.x > zone.left - radius && boat.x < zone.right + radius;
  const insideY = boat.y > zone.top - radius && boat.y < zone.bottom + radius;

  if (!insideX || !insideY) return;

  const pushLeft = Math.abs(boat.x - (zone.left - radius));
  const pushUp = Math.abs(boat.y - (zone.top - radius));

  if (pushLeft < pushUp) {
    boat.x = zone.left - radius;
  } else {
    boat.y = zone.top - radius;
  }
}

function hasActiveSkier() {
  return trafficBoats.some((traffic) => traffic.type.name === "Skier");
}

function prepareTrafficTargets() {
  trafficBoats.forEach((traffic) => {
    if (traffic.type.name !== "Skier") {
      traffic.targetY = traffic.baseY;
      traffic.vx = traffic.baseVx;
    }
  });
}

function applyTrafficSeparation() {
  for (let i = 0; i < trafficBoats.length; i += 1) {
    for (let j = i + 1; j < trafficBoats.length; j += 1) {
      const a = trafficBoats[i];
      const b = trafficBoats[j];
      const minDistance = 54 + (a.width + b.width) * 0.22;
      const gap = distance(a.x, a.y, b.x, b.y);
      if (gap >= minDistance) continue;

      steerTrafficAway(a, b, minDistance - gap);
      steerTrafficAway(b, a, minDistance - gap);
    }
  }
}

function steerTrafficAway(subject, other, overlap) {
  if (subject.type.name === "Skier") return;

  if (other.type.name === "Skier") {
    subject.vx = subject.baseVx * 0.48;
    subject.targetY = clampTrafficYToSafe(subject.baseY + (subject.y <= other.y ? -84 : 84), subject);
    return;
  }

  const direction = subject.y <= other.y ? -1 : 1;
  const desired = subject.baseY + direction * Math.max(70, overlap * 1.4);
  subject.targetY = clampTrafficYToSafe(desired, subject);
}

function clampTrafficYToSafe(preferredY, subject) {
  const limits = { min: 190, max: canvas.height - 140 };
  const hazards = getCurrentDay().hazards;
  const candidates = [
    preferredY,
    preferredY + 70,
    preferredY - 70,
    subject.baseY + 90,
    subject.baseY - 90,
    subject.baseY,
  ].map((value) => Math.max(limits.min, Math.min(limits.max, value)));

  for (const candidate of candidates) {
    const clearHazards = hazards.every((hazard) => Math.abs(candidate - hazard.y) > hazard.r + 82);
    const clearTraffic = trafficBoats.every((traffic) => traffic === subject || traffic.type.name === "Skier" || Math.abs(traffic.y - candidate) > 56);
    if (clearHazards && clearTraffic) return candidate;
  }

  return Math.max(limits.min, Math.min(limits.max, subject.baseY));
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

function showCrashMessage() {
  const crashLine = activeChallenge
    ? `You were chasing ${activeChallenge.captain}'s ${formatTime(activeChallenge.timeMs)} run.`
    : "Traffic on the course ended your run.";
  showMessage("Collision!", `${crashLine} Sail again and keep clear of crossing traffic.`);
}

function updateShareButton() {
  shareButtonEl.disabled = !lastResult;
  sharePanelEl.classList.toggle("hidden", !lastResult);
  sharePreviewEl.textContent = lastResult ? buildSharePayload().previewText : "";
}

function updateMusicButton() {
  musicButtonEl.textContent = audioState.enabled ? "Music On" : "Music Off";
}

async function ensureMusicPlayback() {
  if (!audioState.enabled || audioState.unlocked) return;
  try {
    bgMusicEl.volume = 0.45;
    await bgMusicEl.play();
    audioState.unlocked = true;
  } catch (error) {
    audioState.unlocked = false;
  }
}

function toggleMusic() {
  audioState.enabled = !audioState.enabled;
  localStorage.setItem("sunrise-sail-music-enabled", audioState.enabled ? "1" : "0");
  updateMusicButton();

  if (!audioState.enabled) {
    bgMusicEl.pause();
    return;
  }

  ensureMusicPlayback();
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
  drawTraffic();
  drawBoat();
  drawCanvasRaceHud();
}

function drawCanvasRaceHud() {
  const uiScale = getBoardUiScale();
  const timeText = formatTime(elapsedMs);
  const remainingTargetMs = activeChallenge ? activeChallenge.timeMs - elapsedMs : null;
  const targetLate = remainingTargetMs !== null && remainingTargetMs < 0;
  const targetText = activeChallenge ? formatCountdown(remainingTargetMs) : "Solo";
  const pillHeight = 46 * uiScale;
  const gap = 14 * uiScale;
  const timeWidth = 154 * uiScale;
  const targetWidth = 158 * uiScale;
  const totalWidth = timeWidth + targetWidth + gap;
  const x = (canvas.width - totalWidth) / 2;
  const y = 18;
  const labelFont = `${Math.round(12 * uiScale)}px Trebuchet MS`;
  const valueFont = `bold ${Math.round(21 * uiScale)}px Trebuchet MS`;

  drawCanvasHudPill(x, y, timeWidth, pillHeight, "Time", timeText, labelFont, valueFont);
  drawCanvasHudPill(
    x + timeWidth + gap,
    y,
    targetWidth,
    pillHeight,
    "Target",
    targetText,
    labelFont,
    valueFont,
    targetLate
      ? { fill: "rgba(204, 62, 48, 0.94)", stroke: "rgba(139, 24, 13, 0.5)", label: "rgba(255, 232, 228, 0.95)", value: "#ffffff" }
      : undefined
  );
}

function drawCanvasHudPill(x, y, width, height, label, value, labelFont, valueFont, colors = {}) {
  ctx.save();
  roundRect(ctx, x, y, width, height, 18);
  ctx.fillStyle = colors.fill || "rgba(248, 251, 255, 0.9)";
  ctx.fill();
  ctx.strokeStyle = colors.stroke || "rgba(23, 50, 77, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = colors.label || "rgba(93, 113, 130, 0.95)";
  ctx.font = labelFont;
  ctx.fillText(label, x + 14, y + 15);

  ctx.fillStyle = colors.value || "#17324d";
  ctx.font = valueFont;
  ctx.fillText(value, x + 14, y + 36);
  ctx.restore();
}

function formatCountdown(ms) {
  const negative = ms < 0;
  const absoluteMs = Math.abs(ms);
  return `${negative ? "-" : ""}${formatTime(absoluteMs)}`;
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
  const objectScale = getObjectScale();
  const uiScale = getBoardUiScale();

  ctx.save();
  day.hazards.forEach((hazard) => {
    if (art.shoal && art.shoal.complete) {
      const size = hazard.r * 2.35 * objectScale;
      ctx.drawImage(art.shoal, hazard.x - size / 2, hazard.y - size / 2, size, size);
      ctx.fillStyle = "rgba(132, 86, 53, 0.82)";
      ctx.font = `bold ${Math.round(18 * uiScale)}px Trebuchet MS`;
      ctx.fillText("Shoal", hazard.x - 24 * uiScale, hazard.y + 6 * uiScale);
      return;
    }

    ctx.save();
    const shoal = ctx.createRadialGradient(hazard.x, hazard.y, 10, hazard.x, hazard.y, hazard.r);
    shoal.addColorStop(0, "rgba(214, 191, 148, 0.42)");
    shoal.addColorStop(0.58, "rgba(180, 163, 129, 0.28)");
    shoal.addColorStop(1, "rgba(185, 177, 163, 0.1)");
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fillStyle = shoal;
    ctx.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r - 16 - ring * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(214, 191, 148, ${0.16 - ring * 0.03})`;
      ctx.lineWidth = 5 - ring;
      ctx.stroke();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(173, 87, 52, 0.78)";
    ctx.stroke();

    const rockOffsets = [
      [-22, -10, 8],
      [8, -18, 6],
      [20, 12, 7],
      [-14, 18, 5],
    ];
    rockOffsets.forEach(([dx, dy, radius]) => {
      ctx.beginPath();
      ctx.arc(hazard.x + dx, hazard.y + dy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(128, 118, 103, 0.55)";
      ctx.fill();
    });

    ctx.fillStyle = "rgba(132, 86, 53, 0.82)";
    ctx.font = `bold ${Math.round(18 * uiScale)}px Trebuchet MS`;
    ctx.fillText("Shoal", hazard.x - 24 * uiScale, hazard.y + 6 * uiScale);
    ctx.restore();
  });

  markers.forEach((marker, index) => {
    if (art.marker && art.marker.complete) {
      const markerScale = objectScale * 1.5;
      const size = marker.r * 3.2 * markerScale;
      ctx.drawImage(art.marker, marker.x - size / 2, marker.y - size / 2, size, size);
      ctx.beginPath();
      ctx.arc(marker.x, marker.y - marker.r * 0.94 * markerScale, marker.r * 0.58 * markerScale, 0, Math.PI * 2);
      ctx.fillStyle = markerHits[index] ? "rgba(255, 232, 138, 0.96)" : "rgba(255, 250, 240, 0.94)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(53, 87, 122, 0.9)";
      ctx.stroke();
      ctx.fillStyle = "#35577a";
      ctx.font = `bold ${Math.round(14 * uiScale)}px Trebuchet MS`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${index + 1}`, marker.x, marker.y - marker.r * 0.94 * markerScale + 0.5);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      return;
    }

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
    ctx.font = `bold ${Math.round(18 * uiScale)}px Trebuchet MS`;
    ctx.fillText(`${index + 1}`, marker.x - 5 * uiScale, marker.y + 6 * uiScale);
  });

  const finishWidth = finishLine.x2 - finishLine.x1;
  const segmentWidth = finishWidth / 10;
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(finishLine.x1 + i * segmentWidth, finishLine.y);
    ctx.lineTo(finishLine.x1 + (i + 1) * segmentWidth, finishLine.y);
    ctx.lineWidth = 10 * uiScale;
    ctx.strokeStyle = i % 2 === 0 ? "#f8fbff" : "#244a65";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = "rgba(23, 50, 77, 0.75)";
  ctx.font = `bold ${Math.round(28 * uiScale)}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Finish", (finishLine.x1 + finishLine.x2) / 2, finishLine.y + 18 * uiScale);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  drawWindArrow(day.windAngle);
  ctx.restore();
}

function drawWindArrow(windAngleDegrees) {
  const angle = (windAngleDegrees * Math.PI) / 180;
  const scale = getBoardUiScale();
  const cardX = 26;
  const cardY = 20;
  const cardW = 164 * scale;
  const cardH = 68 * scale;
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fillStyle = "rgba(248, 251, 255, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(23, 50, 77, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "rgba(23, 50, 77, 0.82)";
  ctx.font = `bold ${Math.round(22 * scale)}px Trebuchet MS`;
  ctx.fillText("Wind", cardX + 16 * scale, cardY + 26 * scale);

  const centerX = cardX + 112 * scale;
  const centerY = cardY + 42 * scale;
  const length = 38 * scale;
  const startX = centerX - Math.cos(angle) * length * 0.45;
  const startY = centerY - Math.sin(angle) * length * 0.45;
  const endX = centerX + Math.cos(angle) * length;
  const endY = centerY + Math.sin(angle) * length;

  ctx.strokeStyle = "rgba(23, 50, 77, 0.8)";
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 15 * scale * Math.cos(angle - 0.46), endY - 15 * scale * Math.sin(angle - 0.46));
  ctx.lineTo(endX - 15 * scale * Math.cos(angle + 0.46), endY - 15 * scale * Math.sin(angle + 0.46));
  ctx.closePath();
  ctx.fillStyle = "rgba(23, 50, 77, 0.82)";
  ctx.fill();
}

function drawBoat() {
  const scale = getVesselScale();
  if (art.sailboat && art.sailboat.complete) {
    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle + Math.PI / 2);
    const width = 118 * scale;
    const height = 118 * scale;
    ctx.drawImage(art.sailboat, -width / 2, -height / 2, width, height);
    ctx.restore();
    return;
  }

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

function drawTraffic() {
  trafficBoats.forEach((traffic) => {
    ctx.save();
    ctx.translate(traffic.x, traffic.y);
    ctx.rotate(traffic.angle);
    drawTrafficVessel(traffic);

    ctx.restore();
  });
}

function drawTrafficVessel(traffic) {
  const name = traffic.type.name;
  const artImage = art[traffic.type.asset];
  const scale = getVesselScale();

  if (artImage && artImage.complete) {
    ctx.rotate(Math.PI / 2);
    const width = 118 * traffic.type.size * scale;
    const height = 118 * traffic.type.size * scale;
    ctx.drawImage(artImage, -width / 2, -height / 2, width, height);

    if (name === "Skier") {
      const skierWave = Math.sin(traffic.theta * 2) * 16;
      const ropeEndX = -width * 0.86;
      const ropeEndY = height * 0.08;
      const skierX = ropeEndX - 38;
      const skierY = ropeEndY + skierWave;

      ctx.strokeStyle = "#8ecae6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width * 0.32, height * 0.02);
      ctx.quadraticCurveTo(-width * 0.56, height * 0.02, ropeEndX, ropeEndY);
      ctx.quadraticCurveTo(skierX + 16, skierY - 4, skierX, skierY);
      ctx.stroke();

      ctx.fillStyle = "#8ecae6";
      ctx.beginPath();
      ctx.arc(skierX, skierY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8ecae6";
      ctx.beginPath();
      ctx.moveTo(skierX - 7, skierY + 7);
      ctx.lineTo(skierX + 7, skierY + 7);
      ctx.stroke();
    }
    return;
  }

  if (name === "Tug") {
    ctx.fillStyle = "#274c67";
    ctx.beginPath();
    ctx.moveTo(-42, 14);
    ctx.lineTo(18, 18);
    ctx.quadraticCurveTo(42, 10, 40, -4);
    ctx.lineTo(36, -18);
    ctx.lineTo(-38, -18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d07b39";
    ctx.fillRect(-8, -30, 26, 18);
    ctx.fillStyle = "#f3efe8";
    ctx.fillRect(-2, -26, 10, 8);
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.lineTo(8, -38);
    ctx.lineTo(24, -26);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (name === "Cruise") {
    ctx.fillStyle = "#5f7f95";
    ctx.beginPath();
    ctx.moveTo(-54, 16);
    ctx.lineTo(36, 18);
    ctx.quadraticCurveTo(56, 4, 56, -6);
    ctx.lineTo(54, -20);
    ctx.lineTo(-48, -20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f8f4ef";
    ctx.beginPath();
    ctx.moveTo(-26, -12);
    ctx.lineTo(22, -10);
    ctx.lineTo(16, 8);
    ctx.lineTo(-32, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8ecae6";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(-18 + i * 10, -8, 6, 4);
    }
    return;
  }

  if (name === "Wind Surfer") {
    ctx.fillStyle = "#244760";
    ctx.beginPath();
    ctx.ellipse(-10, 8, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-6, -28);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(-6, -26);
    ctx.lineTo(-6, -2);
    ctx.lineTo(22, -10);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (name === "Jet Ski") {
    ctx.fillStyle = "#18364d";
    ctx.beginPath();
    ctx.moveTo(-24, 8);
    ctx.quadraticCurveTo(-4, 14, 20, 6);
    ctx.lineTo(16, -2);
    ctx.quadraticCurveTo(-4, -8, -20, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f46036";
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(14, -2);
    ctx.lineTo(4, 6);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (name === "Skier") {
    ctx.fillStyle = "#2b5876";
    ctx.beginPath();
    ctx.moveTo(-34, 10);
    ctx.lineTo(18, 14);
    ctx.lineTo(24, 0);
    ctx.lineTo(16, -10);
    ctx.lineTo(-30, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8ecae6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, 2);
    ctx.lineTo(-60, 14);
    ctx.stroke();
    ctx.fillStyle = "#8ecae6";
    ctx.beginPath();
    ctx.arc(-66, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
}

function loop(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const dt = Math.min(0.032, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;

  if (raceStarted && !isFinished) elapsedMs += dt * 1000;

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

function updateStartOverlay() {
  if (raceStarted || isFinished) {
    startOverlayEl.classList.add("hidden");
    canvasShellEl.classList.remove("awaiting-start");
    return;
  }

  const isChallenge = Boolean(activeChallenge);
  startTitleEl.textContent = isChallenge ? "Beat The Clock" : "Ready To Sail?";
  startBodyEl.textContent = isChallenge
    ? `Target time is ${formatTime(activeChallenge.timeMs)}. Tap start when you are ready.`
    : "Tap start when you are ready. Your clock will begin on the horn.";
  startOverlayEl.classList.remove("hidden");
  canvasShellEl.classList.add("awaiting-start");
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
      beatTime ? "You Won!" : "You Lost",
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
  audioState.enabled = localStorage.getItem("sunrise-sail-music-enabled") !== "0";
  captainNameEl.value = profile.captain;
  boatNameEl.value = profile.boat;
  updateMusicButton();
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

function sanitizeShareValue(value, fallback, maxLength = 48) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.'-]/g, "")
    .trim();

  return (cleaned || fallback).slice(0, maxLength);
}

function sanitizeShareTime(value) {
  const formatted = formatTime(Number(value) || 0);
  return /^\d{2}:\d{2}\.\d$/.test(formatted) ? formatted : "00:00.0";
}

function buildSharePayload() {
  if (!lastResult) {
    const url = buildShareUrl();
    return {
      title: "Sunrise Sail",
      text: "Can you beat my time?",
      url,
      clipboardText: `Can you beat my time? ${url}`,
      previewText: "Can you beat my time?",
    };
  }

  const captain = sanitizeShareValue(lastResult.captain, "Skipper", 24);
  const boat = sanitizeShareValue(lastResult.boat, "Morning Star", 24);
  const course = sanitizeShareValue(days[lastResult.dayIndex]?.name, "Harbor Dash", 28);
  const time = sanitizeShareTime(lastResult.timeMs);
  const url = buildShareUrl();
  const text = `${captain} aboard ${boat} finished ${course} in ${time}. Can you beat my time?`;

  return {
    title: "Sunrise Sail",
    text,
    url,
    clipboardText: `${text} ${url}`,
    previewText: text,
  };
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
  shareCtx.font = "700 24px Trebuchet MS";
  shareCtx.fillText("DAILY SAILING SPRINT", 86, 120);
  shareCtx.font = "700 60px Trebuchet MS";
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
  shareCtx.fillText("Beat my time", 824, 112);

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
  const sharePayload = buildSharePayload();
  const shareData = {
    title: sharePayload.title,
    text: sharePayload.text,
    url: sharePayload.url,
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

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(sharePayload.clipboardText);
    showMessage("Share Ready", "Challenge copied. Paste it into Messages, email, or anywhere you want to share it.");
    return;
  }

  showMessage("Share This", sharePayload.clipboardText);
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
  if (!button) return;
  const activate = (event) => {
    event.preventDefault();
    ensureMusicPlayback();
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

function setSwipeSteering(event) {
  const rect = canvas.getBoundingClientRect();
  const dragDistance = rect.width * 0.28;
  const deltaX = (event.clientX - swipeSteering.startX) / dragDistance;
  const raw = Math.max(-1, Math.min(1, deltaX));
  controls.steer = Math.abs(raw) < 0.08 ? 0 : raw;
}

function releaseSwipeSteering() {
  swipeSteering.pointerId = null;
  controls.steer = 0;
}

function bindSwipeSteering() {
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!raceStarted || isFinished) return;
    event.preventDefault();
    ensureMusicPlayback();
    swipeSteering.pointerId = event.pointerId;
    swipeSteering.startX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    setSwipeSteering(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (swipeSteering.pointerId !== event.pointerId) return;
    event.preventDefault();
    setSwipeSteering(event);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (swipeSteering.pointerId !== event.pointerId) return;
    releaseSwipeSteering();
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (swipeSteering.pointerId !== event.pointerId) return;
    releaseSwipeSteering();
  });
}

function syncHudDrawer() {
  if (window.matchMedia("(min-width: 900px)").matches) {
    hudDrawerEl.open = true;
    return;
  }

  if (!hudDrawerInitialized) {
    hudDrawerEl.open = false;
  }
}

function startNewDay(nextIndex = currentDayIndex) {
  currentDayIndex = nextIndex;
  resetBoat();
  renderConditions();
  updateHud();
  updateStartOverlay();
}

document.getElementById("new-day-button").addEventListener("click", () => {
  ensureMusicPlayback();
  activeChallenge = null;
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url);
  startNewDay((currentDayIndex + 1) % days.length);
});

document.getElementById("restart-button").addEventListener("click", () => {
  ensureMusicPlayback();
  startNewDay(currentDayIndex);
});

function activateStartRace(event) {
  if (event) event.preventDefault();
  const currentScrollY = window.scrollY;
  ensureMusicPlayback();
  startButtonEl.blur();
  raceStarted = true;
  updateStartOverlay();
  requestAnimationFrame(() => {
    window.scrollTo(0, currentScrollY);
  });
}

startButtonEl.addEventListener("click", activateStartRace);
startButtonEl.addEventListener("pointerup", activateStartRace);

captainNameEl.addEventListener("input", saveProfile);
boatNameEl.addEventListener("input", saveProfile);
musicButtonEl.addEventListener("click", toggleMusic);
expandButtonEl.addEventListener("click", (event) => {
  event.preventDefault();
  toggleExpandedMode();
});
shareButtonEl.addEventListener("click", () => {
  shareChallenge().catch(() => {
    showMessage("Share This", buildSharePayload().clipboardText);
  });
});

bindButton("boost-button", "trim");
bindSwipeSteering();

window.addEventListener("keydown", (event) => {
  ensureMusicPlayback();
  if (event.key === "ArrowLeft") controls.left = true;
  if (event.key === "ArrowRight") controls.right = true;
  if (event.key === " ") controls.trim = true;
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") controls.left = false;
  if (event.key === "ArrowRight") controls.right = false;
  if (event.key === " ") controls.trim = false;
});

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
window.addEventListener("resize", () => {
  syncHudDrawer();
});

loadProfile();
loadChallengeFromUrl();
syncHudDrawer();
hudDrawerInitialized = true;
startNewDay(currentDayIndex);
updateShareButton();
updateExpandButton();
animationId = requestAnimationFrame(loop);
