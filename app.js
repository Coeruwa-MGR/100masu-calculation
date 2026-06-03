const setupPanel = document.getElementById("setupPanel");
const practicePanel = document.getElementById("practicePanel");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const calculationGrid = document.getElementById("calculationGrid");
const keypadButtons = document.querySelectorAll("[data-key]");
const statusText = document.getElementById("statusText");
const modeLabel = document.getElementById("modeLabel");
const elapsedTime = document.getElementById("elapsedTime");
const finishOverlay = document.getElementById("finishOverlay");
const finalTime = document.getElementById("finalTime");
const accuracyRate = document.getElementById("accuracyRate");
const completedAt = document.getElementById("completedAt");
const screenshotPreview = document.getElementById("screenshotPreview");
const resultImage = document.getElementById("resultImage");
const retryButton = document.getElementById("retryButton");

let mode = "addition";
let topNumbers = [];
let sideNumbers = [];
let inputs = [];
let startTime = 0;
let timerId = 0;
let finished = false;
let completedAtText = "";
let accuracyPercent = 0;
let currentInputIndex = 0;
let lastPointerKeyTime = 0;

function shuffleDigits() {
  const digits = Array.from({ length: 10 }, (_, index) => index);
  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]];
  }
  return digits;
}

function getAnswer(row, column) {
  const left = sideNumbers[row];
  const top = topNumbers[column];
  return mode === "addition" ? left + top : left * top;
}

function formatTime(milliseconds) {
  const totalTenths = Math.floor(milliseconds / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join(".") + ` ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function updateTimer() {
  elapsedTime.textContent = formatTime(Date.now() - startTime);
}

function calculateAccuracy() {
  const correctCount = inputs.filter((input) => {
    const row = Number(input.dataset.row);
    const column = Number(input.dataset.column);
    return Number(input.value) === getAnswer(row, column);
  }).length;
  return Math.round((correctCount / inputs.length) * 100);
}

function clearResultImage() {
  screenshotPreview.classList.add("is-hidden");
  resultImage.removeAttribute("src");
}

function checkCompletion() {
  if (!finished && inputs.every((item) => item.value !== "")) {
    finishPractice();
  }
}

function setAnswerValue(input, value) {
  input.value = value.replace(/\D/g, "").slice(0, 2);
  input.classList.remove("is-correct", "is-wrong");
  checkCompletion();
}

function makeCell(className, text) {
  const cell = document.createElement("div");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function buildGrid() {
  calculationGrid.innerHTML = "";
  inputs = [];

  calculationGrid.appendChild(makeCell("corner-cell", mode === "addition" ? "+" : "\u00d7"));

  topNumbers.forEach((number) => {
    calculationGrid.appendChild(makeCell("header-cell", number));
  });

  sideNumbers.forEach((number, row) => {
    calculationGrid.appendChild(makeCell("header-cell", number));

    topNumbers.forEach((_, column) => {
      const input = document.createElement("input");
      input.className = "answer-input";
      input.type = "text";
      input.inputMode = "none";
      input.autocomplete = "off";
      input.enterKeyHint = "next";
      input.maxLength = 2;
      input.readOnly = true;
      input.dataset.row = String(row);
      input.dataset.column = String(column);
      const operatorLabel = mode === "addition" ? "\u8db3\u3059" : "\u304b\u3051\u308b";
      input.setAttribute("aria-label", `${number} ${operatorLabel} ${topNumbers[column]}`);

      input.addEventListener("input", handleInput);
      input.addEventListener("keydown", handleKeyDown);
      input.addEventListener("focus", () => {
        currentInputIndex = inputs.indexOf(input);
        input.select();
      });

      inputs.push(input);
      calculationGrid.appendChild(input);
    });
  });
}

function moveToIndex(index) {
  const next = inputs[index];
  if (!next) {
    return;
  }
  currentInputIndex = index;
  next.focus();
  next.select();
}

function getCurrentInput() {
  return inputs[currentInputIndex] || inputs[0];
}

function moveNext() {
  moveToIndex(Math.min(currentInputIndex + 1, inputs.length - 1));
}

function enterDigit(digit) {
  const input = getCurrentInput();
  if (!input || finished) {
    return;
  }

  setAnswerValue(input, `${input.value}${digit}`);
  if (!finished && input.value.length >= 2) {
    moveNext();
  } else if (!finished) {
    input.focus();
    input.select();
  }
}

function deleteDigit() {
  const input = getCurrentInput();
  if (!input || finished) {
    return;
  }

  if (input.value === "") {
    moveToIndex(Math.max(currentInputIndex - 1, 0));
    return;
  }

  setAnswerValue(input, input.value.slice(0, -1));
  if (!finished) {
    input.focus();
    input.select();
  }
}

function handleKeypad(event) {
  if (Date.now() - lastPointerKeyTime < 500) {
    event.preventDefault();
    return;
  }

  const key = event.currentTarget.dataset.key;
  handleKeypadKey(key);
}

function handleKeypadKey(key) {
  if (key === "back") {
    deleteDigit();
    return;
  }
  if (key === "next") {
    moveNext();
    return;
  }
  enterDigit(key);
}

function handleKeypadPointer(event) {
  const button = event.target.closest("[data-key]");
  if (!button || !practicePanel.contains(button)) {
    return;
  }

  event.preventDefault();
  lastPointerKeyTime = Date.now();
  handleKeypadKey(button.dataset.key);
}

function handleKeyDown(event) {
  const index = inputs.indexOf(event.currentTarget);

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    currentInputIndex = index;
    enterDigit(event.key);
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    moveToIndex(index + (event.shiftKey ? -1 : 1));
  }

  if (event.key === "Enter") {
    event.preventDefault();
    moveNext();
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    currentInputIndex = index;
    deleteDigit();
  }
}

function handleInput(event) {
  const input = event.currentTarget;
  setAnswerValue(input, input.value);
}

function startPractice() {
  mode = document.querySelector("input[name='mode']:checked").value;
  topNumbers = shuffleDigits();
  sideNumbers = shuffleDigits();
  finished = false;
  currentInputIndex = 0;

  modeLabel.textContent = mode === "addition" ? "\u8db3\u3057\u7b97" : "\u639b\u3051\u7b97";
  statusText.textContent = "\u8a08\u7b97\u4e2d";
  elapsedTime.textContent = "00:00.0";
  finalTime.textContent = "00:00.0";
  accuracyRate.textContent = "0%";
  accuracyPercent = 0;
  completedAt.textContent = "0000.00.00 00:00:00";
  clearResultImage();
  completedAtText = "";
  finishOverlay.classList.add("is-hidden");

  buildGrid();
  setupPanel.classList.add("is-hidden");
  practicePanel.classList.remove("is-hidden");

  startTime = Date.now();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 100);
  updateTimer();

  requestAnimationFrame(() => moveToIndex(0));
}

function finishPractice() {
  finished = true;
  clearInterval(timerId);
  updateTimer();
  accuracyPercent = calculateAccuracy();
  completedAtText = formatDateTime(new Date());
  finalTime.textContent = elapsedTime.textContent;
  accuracyRate.textContent = `${accuracyPercent}%`;
  completedAt.textContent = completedAtText;
  statusText.textContent = "\u5b8c\u6210";
  finishOverlay.classList.remove("is-hidden");
  showResultPreview(createResultImage());
  retryButton.focus();
}

function drawRoundRect(context, x, y, width, height, radius) {
  const size = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + size, y);
  context.lineTo(x + width - size, y);
  context.quadraticCurveTo(x + width, y, x + width, y + size);
  context.lineTo(x + width, y + height - size);
  context.quadraticCurveTo(x + width, y + height, x + width - size, y + height);
  context.lineTo(x + size, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - size);
  context.lineTo(x, y + size);
  context.quadraticCurveTo(x, y, x + size, y);
  context.closePath();
}

function drawCenteredText(context, text, x, y, width, height) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + width / 2, y + height / 2);
}

function createResultImage() {
  const scale = 2;
  const width = 1200;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#f7f5ef";
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(15, 118, 110, 0.12)");
  gradient.addColorStop(0.55, "rgba(255, 253, 247, 0.9)");
  gradient.addColorStop(1, "rgba(242, 184, 75, 0.16)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#0b5d56";
  context.font = "800 20px system-ui, sans-serif";
  context.fillText(mode === "addition" ? "\u8db3\u3057\u7b97" : "\u639b\u3051\u7b97", 46, 64);

  context.fillStyle = "#16201c";
  context.font = "950 56px system-ui, sans-serif";
  context.fillText("Finish", 46, 126);

  context.font = "900 32px system-ui, sans-serif";
  context.fillText(`\u304b\u304b\u3063\u305f\u6642\u9593 ${finalTime.textContent}`, 46, 180);

  context.fillStyle = "#0b5d56";
  context.font = "900 28px system-ui, sans-serif";
  context.fillText(`\u6b63\u7b54\u7387 ${accuracyPercent}%`, 46, 220);

  context.fillStyle = "#66736e";
  context.font = "800 22px system-ui, sans-serif";
  context.fillText(`\u5b8c\u4e86\u65e5\u6642 ${completedAtText}`, 46, 256);

  context.fillStyle = "#ddf5e9";
  drawRoundRect(context, 470, 222, 34, 24, 5);
  context.fill();
  context.fillStyle = "#16201c";
  context.font = "800 18px system-ui, sans-serif";
  context.fillText("\u6b63\u89e3", 514, 241);

  context.fillStyle = "#ffe2df";
  drawRoundRect(context, 590, 222, 34, 24, 5);
  context.fill();
  context.fillStyle = "#16201c";
  context.fillText("\u30df\u30b9", 634, 241);

  const gridX = 46;
  const gridY = 294;
  const labelSize = 54;
  const cellW = 100;
  const cellH = 54;
  const gap = 4;

  for (let row = 0; row < 11; row += 1) {
    for (let column = 0; column < 11; column += 1) {
      const x = column === 0
        ? gridX
        : gridX + labelSize + gap + (column - 1) * (cellW + gap);
      const y = gridY + row * (cellH + gap);
      const w = column === 0 ? labelSize : cellW;
      const h = cellH;
      const isCorner = row === 0 && column === 0;
      const isHeader = row === 0 || column === 0;

      const inputIndex = (row - 1) * 10 + (column - 1);
      const input = !isHeader ? inputs[inputIndex] : null;
      const isCorrect = input
        ? Number(input.value) === getAnswer(row - 1, column - 1)
        : false;

      context.fillStyle = isCorner
        ? "#0f766e"
        : isHeader
          ? "#edf4ef"
          : isCorrect
            ? "#ddf5e9"
            : "#ffe2df";
      drawRoundRect(context, x, y, w, h, 6);
      context.fill();

      context.fillStyle = isCorner ? "#ffffff" : "#005c57";
      context.font = "900 22px system-ui, sans-serif";

      if (isCorner) {
        drawCenteredText(context, mode === "addition" ? "+" : "\u00d7", x, y, w, h);
      } else if (row === 0) {
        drawCenteredText(context, String(topNumbers[column - 1]), x, y, w, h);
      } else if (column === 0) {
        drawCenteredText(context, String(sideNumbers[row - 1]), x, y, w, h);
      } else {
        const value = input.value;
        context.fillStyle = "#16201c";
        context.font = "850 21px system-ui, sans-serif";
        drawCenteredText(context, value, x, y, w, h);
      }
    }
  }

  return canvas;
}

function showResultPreview(canvas) {
  clearResultImage();
  const dataUrl = canvas.toDataURL("image/png");
  resultImage.src = dataUrl;
  screenshotPreview.classList.remove("is-hidden");
}

function restartPractice() {
  clearInterval(timerId);
  finishOverlay.classList.add("is-hidden");
  practicePanel.classList.add("is-hidden");
  setupPanel.classList.remove("is-hidden");
  startButton.focus();
}

startButton.addEventListener("click", startPractice);
restartButton.addEventListener("click", restartPractice);
retryButton.addEventListener("click", startPractice);
keypadButtons.forEach((button) => {
  button.addEventListener("click", handleKeypad);
});
document.addEventListener("pointerdown", handleKeypadPointer);
