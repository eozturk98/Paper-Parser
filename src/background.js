import { extractReadableTextFromHtml } from "./contentExtractor.js";
import { extractTextFromPdfBuffer } from "./fileParsers.js";
import { cleanText, isValidHttpUrl } from "./utils.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "fetchUrlText") {
        const result = await fetchTextFromUrl(message.url);
        sendResponse({ ok: true, ...result });
        return;
      }

      if (message?.type === "extractCurrentTab") {
        const result = await extractFromCurrentTab();
        sendResponse({ ok: true, ...result });
        return;
      }

      sendResponse({ ok: false, error: "Unknown action." });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Unexpected extraction error." });
    }
  })();

  return true;
});

async function fetchTextFromUrl(url) {
  if (!isValidHttpUrl(url)) {
    throw new Error("Please enter a valid http(s) URL.");
  }

  let response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch {
    throw new Error("Could not access this URL. The website may block requests or be unavailable.");
  }

  if (!response.ok) {
    throw new Error(`Could not access this URL (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const buffer = await response.arrayBuffer();
    const text = cleanText(extractTextFromPdfBuffer(buffer));
    if (!text) {
      throw new Error("This PDF was accessible, but readable text extraction failed or was empty.");
    }
    return {
      text,
      extractionNotes:
        "Source: URL PDF fetch. Extraction quality: best-effort; PDF decoding may be partial or miss layout-heavy sections."
    };
  }

  const html = await response.text();
  const parsed = extractReadableTextFromHtml(html);
  if (!parsed.text) {
    throw new Error("URL was fetched, but no readable article text could be extracted.");
  }
  return parsed;
}

async function extractFromCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found.");
  }

  if (!/^https?:\/\//i.test(tab.url)) {
    throw new Error("Current tab is not a regular webpage (http/https), so extraction is blocked by Chrome.");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS"]);
      const root = document.querySelector("article") || document.querySelector("main") || document.body;

      if (!root) {
        return { text: "", extractionNotes: "No root content found on page." };
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.parentElement) {
            return NodeFilter.FILTER_REJECT;
          }
          if (ignored.has(node.parentElement.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          const value = (node.textContent || "").trim();
          if (!value) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const chunks = [];
      while (walker.nextNode()) {
        chunks.push(walker.currentNode.textContent.trim());
      }

      return {
        text: chunks.join("\n"),
        extractionNotes:
          "Source: current page extraction. Extraction quality: best-effort from visible DOM text; may omit content loaded dynamically or behind scripts."
      };
    }
  });

  const text = cleanText(result?.text || "");
  if (!text) {
    throw new Error("Current page was accessed, but no readable article text was found.");
  }

  return {
    text,
    extractionNotes: result.extractionNotes
  };
}
