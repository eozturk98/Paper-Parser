# Paper Parser Assistant (Chrome Extension)

Paper Parser Assistant is a beginner-friendly Chrome extension that lets you analyze scientific papers from four input modes:

1. Paste text manually
2. Upload a `.txt` or `.pdf` file
3. Enter a public URL
4. Extract text from the current browser tab

It then sends the extracted text to an AI model using the exact structured analysis system in this project.

---

## Why this is simple

- No build tools required
- No server required
- Works as a local Chrome extension
- Uses plain HTML/CSS/JavaScript files

---

## Install and run (beginner)

1. Download or copy this project folder to your computer.
2. Open Google Chrome.
3. Go to `chrome://extensions`.
4. Turn on **Developer mode** (top-right).
5. Click **Load unpacked**.
6. Select this folder (`Paper-Parser`).
7. Pin the extension from the Chrome toolbar if you want easy access.

---

## First-time setup in the popup

1. Open the extension popup.
2. In **AI Settings**:
   - Paste your API key
   - Keep model as `gpt-4.1-mini` (or change if you prefer)
   - Keep API Base URL as `https://api.openai.com`
3. Pick an input mode and run **Analyze Paper**.

Your API key is stored only in your own Chrome local extension storage.

---

## Input modes and expected behavior

### 1) Paste Text
- Best for reliable results.
- The extension analyzes exactly what you pasted.

### 2) Upload File
- `.txt`: high reliability.
- `.pdf`: best-effort text parsing. Complex PDFs (scanned pages, columns, unusual fonts) may be partial.

### 3) Enter URL
- Works on many public article pages.
- Can fail if a site blocks bots, needs login, or heavily relies on JavaScript rendering.

### 4) Use Current Page
- Extracts visible text from the current tab’s DOM.
- Can fail on protected pages (`chrome://`, extension pages), PDF viewer tabs, and dynamic sites.

---

## Error handling built in

The popup explains common failure cases clearly:
- URL not accessible
- Page blocks extraction
- No readable content found
- Partial extraction
- Truncated input due to model limits

When extraction is partial or limited, that fact is sent to the AI instructions so analysis only covers accessible content.

---

## Architecture (for future reuse)

- `src/popup.js`: UI behavior only
- `src/background.js`: browser extraction operations (URL + current tab)
- `src/fileParsers.js`: file parsing logic
- `src/contentExtractor.js`: HTML-to-text logic
- `src/promptTemplate.js`: exact analysis prompt template
- `src/analysisService.js`: model call logic
- `src/utils.js`: shared helpers

This separation makes it easy to reuse core logic in:
- a web app (reuse services/parsers/prompt)
- a desktop app (reuse services/parsers/prompt in Electron/Tauri)

---

## Known limitations

- PDF extraction is intentionally simple for version 1 and may be incomplete.
- Some sites block fetch requests or require authentication.
- Some pages only render full text after client-side scripts, which may reduce extraction quality.
- Very large papers are truncated before model submission to avoid API/token issues.

