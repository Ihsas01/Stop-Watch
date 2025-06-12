const timerEl = document.getElementById("timer");
const startButtonEl = document.getElementById("start");
const stopButtonEl = document.getElementById("stop");
const resetButtonEl = document.getElementById("reset");
const lapButtonEl = document.getElementById("lap");
const lapsEl = document.getElementById("laps");
const themeToggleEl = document.getElementById("theme-toggle");
const colorThemeEl = document.getElementById("color-theme");
const exportLapsEl = document.getElementById("export-laps");
const settingsToggleEl = document.getElementById("settings-toggle");
const settingsPanelEl = document.getElementById("settings-panel");
const soundToggleEl = document.getElementById("sound-toggle");
const hapticToggleEl = document.getElementById("haptic-toggle");
const timerPrecisionEl = document.getElementById("timer-precision");
const splitModeEl = document.getElementById("split-mode");
const clickSound = document.getElementById("click-sound");

let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let lapTimes = JSON.parse(localStorage.getItem("lapTimes")) || [];
let isSplitMode = false;
let timerPrecision = 10;
let isRunning = false;

// WebGL Background
let scene, camera, renderer, particles;
function initWebGL() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("webgl-background").appendChild(renderer.domElement);

  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const primaryColor = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--primary-color"));
  const secondaryColor = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color"));

  for (let i = 0; i < 500; i++) {
    vertices.push(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
    const color = Math.random() > 0.5 ? primaryColor : secondaryColor;
    colors.push(color.r / 255, color.g / 255, color.b / 255);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.5, vertexColors: true });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  animateWebGL();
}

function animateWebGL() {
  particles.rotation.y += 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(animateWebGL);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function updateParticleColors() {
  const colors = particles.geometry.attributes.color.array;
  const primaryColor = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--primary-color"));
  const secondaryColor = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--secondary-color"));
  for (let i = 0; i < colors.length; i += 3) {
    const color = Math.random() > 0.5 ? primaryColor : secondaryColor;
    colors[i] = color.r / 255;
    colors[i + 1] = color.g / 255;
    colors[i + 2] = color.b / 255;
  }
  particles.geometry.attributes.color.needsUpdate = true;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay(elapsedTime);
    updateProgressRing(elapsedTime);
  }, timerPrecision);
  startButtonEl.disabled = true;
  stopButtonEl.disabled = false;
  lapButtonEl.disabled = false;
  playSound();
  triggerHaptic();
}

function formatTime(elapsedTime) {
  const milliseconds = Math.floor((elapsedTime % 1000) / (timerPrecision === 10 ? 10 : 100));
  const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
  const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
  const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
  return (
    (hours ? (hours > 9 ? hours : "0" + hours) : "00") +
    ":" +
    (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") +
    ":" +
    (seconds ? (seconds > 9 ? seconds : "0" + seconds) : "00") +
    (timerPrecision !== 1000 ? "." + (milliseconds > 9 ? milliseconds : "0" + milliseconds) : "")
  );
}

function updateTimerDisplay(elapsedTime) {
  const newTime = formatTime(elapsedTime);
  if (timerEl.textContent !== newTime) {
    timerEl.classList.add("flip");
    timerEl.textContent = newTime;
    setTimeout(() => timerEl.classList.remove("flip"), 300);
  }
}

function stopTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  startButtonEl.disabled = false;
  stopButtonEl.disabled = true;
  lapButtonEl.disabled = true;
  playSound();
  triggerHaptic();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  elapsedTime = 0;
  updateTimerDisplay(0);
  startButtonEl.disabled = false;
  stopButtonEl.disabled = true;
  lapButtonEl.disabled = true;
  lapsEl.innerHTML = "";
  lapTimes = [];
  localStorage.removeItem("lapTimes");
  resetProgressRing();
  playSound();
  triggerHaptic();
}

function addLap() {
  if (elapsedTime > 0) {
    lapTimes.push(elapsedTime);
    localStorage.setItem("lapTimes", JSON.stringify(lapTimes));
    renderLaps();
    playSound();
    triggerHaptic();
  }
}

function renderLaps() {
  lapsEl.innerHTML = "";
  if (isSplitMode && lapTimes.length > 1) {
    const splitTimes = lapTimes.map((time, i) => i === 0 ? time : time - lapTimes[i - 1]);
    lapTimes.forEach((time, index) => {
      const lapEl = document.createElement("div");
      lapEl.classList.add("lap", "split-lap");
      lapEl.setAttribute("role", "listitem");
      lapEl.innerHTML = `
        <span>Lap ${index + 1}: ${formatTime(time)}</span>
        <span>Split: ${formatTime(splitTimes[index])}</span>
      `;
      lapsEl.prepend(lapEl);
    });
  } else {
    lapTimes.forEach((time, index) => {
      const lapEl = document.createElement("div");
      lapEl.classList.add("lap");
      lapEl.setAttribute("role", "listitem");
      lapEl.textContent = `Lap ${index + 1}: ${formatTime(time)}`;
      lapsEl.prepend(lapEl);
    });
  }
}

function updateProgressRing(elapsedTime) {
  const circle = document.querySelector(".progress-ring__circle");
  const circumference = 2 * Math.PI * 160;
  const seconds = (elapsedTime % (1000 * 60)) / 1000;
  const offset = circumference - (seconds / 60) * circumference;
  circle.style.strokeDashoffset = offset;
}

function resetProgressRing() {
  const circle = document.querySelector(".progress-ring__circle");
  const circumference = 2 * Math.PI * 160;
  circle.style.strokeDashoffset = circumference;
}

function playSound() {
  if (soundToggleEl.checked) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }
}

function triggerHaptic() {
  if (hapticToggleEl.checked && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");
  themeToggleEl.textContent = document.body.classList.contains("dark-theme") ? "🌙" : "☀️";
  updateParticleColors();
  playSound();
  triggerHaptic();
}

function updateColorTheme() {
  const theme = colorThemeEl.value;
  const root = document.documentElement;
  if (theme === "neon") {
    root.style.setProperty("--primary-color", "#00ff88");
    root.style.setProperty("--secondary-color", "#ff007a");
    root.style.setProperty("--primary-color-rgb", "0, 255, 136");
    root.style.setProperty("--secondary-color-rgb", "255, 0, 122");
  } else if (theme === "blue") {
    root.style.setProperty("--primary-color", "#00b7eb");
    root.style.setProperty("--secondary-color", "#1e90ff");
    root.style.setProperty("--primary-color-rgb", "0, 183, 235");
    root.style.setProperty("--secondary-color-rgb", "30, 144, 255");
  } else if (theme === "purple") {
    root.style.setProperty("--primary-color", "#9b59b6");
    root.style.setProperty("--secondary-color", "#ff00ff");
    root.style.setProperty("--primary-color-rgb", "155, 89, 182");
    root.style.setProperty("--secondary-color-rgb", "255, 0, 255");
  }
  updateGradient();
  updateParticleColors();
  playSound();
  triggerHaptic();
}

function updateGradient() {
  const gradientStart = document.querySelector(".gradient-start");
  const gradientEnd = document.querySelector(".gradient-end");
  gradientStart.style.stopColor = getComputedStyle(document.documentElement).getPropertyValue("--primary-color");
  gradientEnd.style.stopColor = getComputedStyle(document.documentElement).getPropertyValue("--secondary-color");
}

function exportLaps() {
  if (lapTimes.length === 0) return;
  const csv = isSplitMode
    ? ["Lap,Total Time,Split Time"]
    : ["Lap,Time"];
  const splitTimes = lapTimes.map((time, i) => i === 0 ? time : time - lapTimes[i - 1]);
  lapTimes.forEach((time, index) => {
    const row = isSplitMode
      ? `${index + 1},${formatTime(time)},${formatTime(splitTimes[index])}`
      : `${index + 1},${formatTime(time)}`;
    csv.push(row);
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stopwatch_laps.csv";
  a.click();
  URL.revokeObjectURL(url);
  playSound();
  triggerHaptic();
}

function toggleSettings() {
  settingsPanelEl.hidden = !settingsPanelEl.hidden;
  settingsPanelEl.classList.toggle("slide-in");
  playSound();
  triggerHaptic();
}

function toggleSplitMode() {
  isSplitMode = !isSplitMode;
  renderLaps();
  splitModeEl.textContent = `Toggle Split Mode ${isSplitMode ? "Off" : "On"}`;
  playSound();
  triggerHaptic();
}

function updateTimerPrecision() {
  timerPrecision = parseInt(timerPrecisionEl.value);
  if (isRunning) {
    stopTimer();
    startTimer();
  }
  updateTimerDisplay(elapsedTime);
  renderLaps();
  playSound();
  triggerHaptic();
}

// Voice Command Support
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();
    if (command.includes("start")) startTimer();
    else if (command.includes("stop")) stopTimer();
    else if (command.includes("reset")) resetTimer();
    else if (command.includes("lap")) addLap();
  };
  recognition.onerror = () => {};
  document.addEventListener("keydown", (e) => {
    if (e.key === "v" && !isRunning) {
      recognition.start();
    }
  });
}

// Touch Gestures
let touchStartY = 0;
lapsEl.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
});
lapsEl.addEventListener("touchend", (e) => {
  const touchEndY = e.changedTouches[0].clientY;
  if (touchEndY - touchStartY > 50) {
    addLap();
  }
});

// Debounce Resize
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, 100);
});

startButtonEl.addEventListener("click", startTimer);
stopButtonEl.addEventListener("click", stopTimer);
resetButtonEl.addEventListener("click", resetTimer);
lapButtonEl.addEventListener("click", addLap);
themeToggleEl.addEventListener("click", toggleTheme);
colorThemeEl.addEventListener("change", updateColorTheme);
exportLapsEl.addEventListener("click", exportLaps);
settingsToggleEl.addEventListener("click", toggleSettings);
splitModeEl.addEventListener("click", toggleSplitMode);
timerPrecisionEl.addEventListener("change", updateTimerPrecision);
window.addEventListener("load", () => {
  initWebGL();
  renderLaps();
  updateColorTheme();
});