import { parseUploadedFile } from "./fileParsers.js";
import { analyzePaper } from "./analysisService.js";
import { cleanText } from "./utils.js";

const state = {
  mode: "paste",
  lastOutput: ""
};

const elements = {
  apiKey: document.getElementById("apiKey"),
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  model: document.getElementById("model"),
  paperText: document.getElementById("paperText"),
  paperFile: document.getElementById("paperFile"),
  paperUrl: document.getElementById("paperUrl"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  status: document.getElementById("status"),
  output: document.getElementById("output"),
  copyBtn: document.getElementById("copyBtn"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  modePanels: {
    paste: document.getElementById("mode-paste"),
    file: document.getElementById("mode-file"),
    url: document.getElementById("mode-url"),
    tab: document.getElementById("mode-tab")
  }
};

initialize().catch((error) => {
  setStatus(`Initialization error: ${error.message}`);
});

async function initialize() {
  bindEvents();
  await restoreSettings();
}

function bindEvents() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => switchMode(button.dataset.mode));
  });

  elements.analyzeBtn.addEventListener("click", onAnalyzeClicked);
  elements.copyBtn.addEventListener("click", onCopyClicked);

  [elements.apiKey, elements.apiBaseUrl, elements.model].forEach((input) => {
    input.addEventListener("change", saveSettings);
    input.addEventListener("blur", saveSettings);
  });
}

function switchMode(mode) {
  state.mode = mode;
  for (const button of elements.modeButtons) {
    button.classList.toggle("active", button.dataset.mode === mode);
  }
  for (const [panelMode, panel] of Object.entries(elements.modePanels)) {
    panel.classList.toggle("hidden", panelMode !== mode);
  }
}

async function restoreSettings() {
  const saved = await chrome.storage.local.get(["apiKey", "model", "apiBaseUrl"]);
  if (saved.apiKey) {
    elements.apiKey.value = saved.apiKey;
  }
  if (saved.model) {
    elements.model.value = saved.model;
  }
  if (saved.apiBaseUrl) {
    elements.apiBaseUrl.value = saved.apiBaseUrl;
  }
}

async function saveSettings() {
  await chrome.storage.local.set({
    apiKey: elements.apiKey.value.trim(),
    model: elements.model.value.trim(),
    apiBaseUrl: elements.apiBaseUrl.value.trim()
  });
}

async function onAnalyzeClicked() {
  try {
    setBusy(true, "Reading paper content...");
    await saveSettings();

    const extraction = await collectInputText();
    if (!extraction.text) {
      throw new Error("No readable paper content found. Please try a different input mode.");
    }

    setBusy(true, "Running AI paper analysis...");

    const result = await analyzePaper({
      paperText: extraction.text,
      extractionNotes: extraction.extractionNotes,
      apiKey: elements.apiKey.value.trim(),
      model: elements.model.value.trim(),
      apiBaseUrl: elements.apiBaseUrl.value.trim()
    });

    state.lastOutput = result;
    elements.output.textContent = result;
    elements.copyBtn.disabled = false;
    setStatus("Done. Review your analysis below.");
  } catch (error) {
    const message = error.message || "Unknown error";
    elements.output.textContent = `Error: ${message}`;
    setStatus(`Failed: ${message}`);
  } finally {
    setBusy(false);
  }
}

async function collectInputText() {
  if (state.mode === "paste") {
    const text = cleanText(elements.paperText.value);
    if (!text) {
      throw new Error("Paste mode is selected, but text box is empty.");
    }
    return {
      text,
      extractionNotes: "Source: manually pasted text. Extraction quality: exactly what user provided."
    };
  }

  if (state.mode === "file") {
    const file = elements.paperFile.files?.[0];
    return parseUploadedFile(file);
  }

  if (state.mode === "url") {
    const url = elements.paperUrl.value.trim();
    if (!url) {
      throw new Error("URL mode is selected, but no URL was entered.");
    }
    const response = await chrome.runtime.sendMessage({ type: "fetchUrlText", url });
    if (!response?.ok) {
      throw new Error(response?.error || "Failed to extract text from URL.");
    }
    return {
      text: response.text,
      extractionNotes: response.extractionNotes
    };
  }

  if (state.mode === "tab") {
    const response = await chrome.runtime.sendMessage({ type: "extractCurrentTab" });
    if (!response?.ok) {
      throw new Error(response?.error || "Failed to extract text from current tab.");
    }
    return {
      text: response.text,
      extractionNotes: response.extractionNotes
    };
  }

  throw new Error("Unsupported mode.");
}

async function onCopyClicked() {
  if (!state.lastOutput) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.lastOutput);
    setStatus("Output copied to clipboard.");
  } catch {
    setStatus("Copy failed. You can still select and copy manually.");
  }
}

function setBusy(isBusy, statusMessage = "") {
  elements.analyzeBtn.disabled = isBusy;
  elements.copyBtn.disabled = isBusy || !state.lastOutput;
  if (statusMessage) {
    setStatus(statusMessage);
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}
