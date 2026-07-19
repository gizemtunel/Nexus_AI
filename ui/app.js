const sourceText = document.getElementById("sourceText");
const reader = document.getElementById("reader");
const readTime = document.getElementById("readTime");
const speed = document.getElementById("speed");
const fontSize = document.getElementById("fontSize");
const focusMode = document.getElementById("focusMode");
const speedLabel = document.getElementById("speedLabel");
const restartButton = document.getElementById("restart");
const instantButton = document.getElementById("instant");

let timerId = null;
let currentTokens = [];
let renderedTokens = [];
let tokenIndex = 0;
let requestId = 0;
let readerTrack = null;

const speedLabels = {
  1: "Çok sakin",
  2: "Sakin",
  3: "Yavaş",
  4: "Yumuşak",
  5: "Orta",
  6: "Orta-hızlı",
  7: "Hızlı",
  8: "Çok hızlı",
  9: "Akıcı",
  10: "Yoğun",
  11: "Süratli",
  12: "Anlık"
};

function tokenize(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => sentence.split(/\s+/));
}

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function ensureTrack() {
  if (readerTrack) {
    return readerTrack;
  }

  reader.innerHTML = "";
  readerTrack = document.createElement("div");
  readerTrack.className = "reader-track";
  reader.appendChild(readerTrack);
  return readerTrack;
}

function centerLatestBlock() {
  const track = ensureTrack();
  const latestBlock = track.querySelector(".block:last-of-type");

  if (!latestBlock) {
    return;
  }

  window.requestAnimationFrame(() => {
    const targetTop = latestBlock.offsetTop - (reader.clientHeight / 2) + (latestBlock.offsetHeight / 2);
    reader.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto"
    });
  });
}

async function fetchPreview(text, speedValue) {
  const response = await fetch("/api/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, speed: speedValue })
  });

  if (!response.ok) {
    throw new Error("Preview request failed");
  }

  return response.json();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBionicText(htmlFragment) {
  return htmlFragment.replace(/\n/g, "<br />");
}

function setReadTime(minutes) {
  readTime.textContent = minutes > 0 ? `${minutes} dk okuma süresi` : "Okuma süresi hesaplanamadı";
}

function render() {
  readerTrack = null;
  ensureTrack();
  renderedTokens = [];

  if (!currentTokens.length) {
    readerTrack.textContent = "Metin bekleniyor...";
    return;
  }
}

function updateReader() {
  const previewPieces = renderedTokens.length ? renderedTokens : ["Metin hazırlanıyor..."];
  const track = ensureTrack();

  while (track.children.length < previewPieces.length) {
    const block = document.createElement("span");
    block.className = "block";
    track.appendChild(block);
  }

  while (track.children.length > previewPieces.length) {
    track.removeChild(track.lastElementChild);
  }

  Array.from(track.children).forEach((block, index) => {
    const piece = previewPieces[index];
    block.innerHTML = renderBionicText(piece);
    block.style.setProperty("--layer", String(index));
  });

  centerLatestBlock();
}

function startStreaming() {
  clearTimer();
  const localRequestId = ++requestId;
  currentTokens = [];
  renderedTokens = [];
  tokenIndex = 0;
  reader.textContent = "Metin hazırlanıyor...";

  const rate = Number(speed.value);
  const fallbackInterval = Math.max(40, 380 - rate * 28);

  fetchPreview(sourceText.value, rate)
    .then((payload) => {
      if (localRequestId !== requestId) {
        return;
      }

      currentTokens = Array.isArray(payload.blocks) && payload.blocks.length
        ? payload.blocks
        : tokenize(sourceText.value);
      setReadTime(Number(payload.read_time_minutes) || 0);
      renderedTokens = [];
      tokenIndex = 0;
      readerTrack = null;
      updateReader();

      const interval = Number(payload.interval_ms) || fallbackInterval;

      timerId = window.setInterval(() => {
        if (localRequestId !== requestId) {
          clearTimer();
          return;
        }

        if (tokenIndex >= currentTokens.length) {
          clearTimer();
          updateReader();
          return;
        }

        renderedTokens.push(currentTokens[tokenIndex]);
        tokenIndex += 1;
        updateReader();
      }, interval);
    })
    .catch(() => {
      if (localRequestId !== requestId) {
        return;
      }

      currentTokens = tokenize(sourceText.value);
      setReadTime(0);
      renderedTokens = [];
      tokenIndex = 0;
      readerTrack = null;
      updateReader();

      timerId = window.setInterval(() => {
        if (localRequestId !== requestId) {
          clearTimer();
          return;
        }

        if (tokenIndex >= currentTokens.length) {
          clearTimer();
          updateReader();
          return;
        }

        renderedTokens.push(currentTokens[tokenIndex]);
        tokenIndex += 1;
        updateReader();
      }, fallbackInterval);
    });
}

function showInstant() {
  clearTimer();
  currentTokens = tokenize(sourceText.value);
  renderedTokens = [...currentTokens];
  readerTrack = null;
  updateReader();
}

function syncStyles() {
  reader.style.fontSize = `${fontSize.value}px`;
  reader.classList.toggle("focus-mode", focusMode.checked);
  speedLabel.textContent = speedLabels[speed.value] ?? "Orta";
}

speed.addEventListener("input", () => {
  syncStyles();
  startStreaming();
});

fontSize.addEventListener("input", syncStyles);
focusMode.addEventListener("change", syncStyles);
sourceText.addEventListener("input", startStreaming);
restartButton.addEventListener("click", startStreaming);
instantButton.addEventListener("click", showInstant);

syncStyles();
startStreaming();
