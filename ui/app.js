const sourceText = document.getElementById("sourceText");
const reader = document.getElementById("reader");
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

function buildAccessiblePreview(text) {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (!sentences.length) {
    return ["Metin gelmedi. Soldaki alana içerik ekleyin."];
  }

  return sentences.map((sentence, index) => {
    const shortSentence = sentence.length > 140
      ? sentence.match(/.{1,120}(?:\s|$)/g)?.join("\n") ?? sentence
      : sentence;

    return index % 2 === 0 ? shortSentence : `• ${shortSentence}`;
  });
}

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
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

function render() {
  reader.innerHTML = "";
  renderedTokens = [];

  if (!currentTokens.length) {
    reader.textContent = "Metin bekleniyor...";
    return;
  }

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.textContent = "▍";
  reader.appendChild(cursor);
}

function updateReader() {
  const previewPieces = buildAccessiblePreview(renderedTokens.join(" "));
  reader.innerHTML = "";

  previewPieces.forEach((piece, index) => {
    const block = document.createElement("span");
    block.className = "block";
    block.textContent = piece;
    reader.appendChild(block);
    if (index < previewPieces.length - 1) {
      reader.appendChild(document.createTextNode("\n\n"));
    }
  });

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.textContent = renderedTokens.length < currentTokens.length ? "▍" : "";
  reader.appendChild(cursor);
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
      renderedTokens = [];
      tokenIndex = 0;
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
      renderedTokens = [];
      tokenIndex = 0;
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
