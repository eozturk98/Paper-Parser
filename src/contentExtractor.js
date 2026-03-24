import { cleanText } from "./utils.js";

export function extractReadableTextFromHtml(html) {
  if (!html || typeof html !== "string") {
    return { text: "", extractionNotes: "No HTML content received." };
  }

  let working = html;
  working = working.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  working = working.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");

  const articleMatch = working.match(/<article[\s\S]*?<\/article>/i);
  const mainMatch = working.match(/<main[\s\S]*?<\/main>/i);
  const preferred = articleMatch?.[0] || mainMatch?.[0] || working;

  const text = preferred
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');

  const cleaned = cleanText(text);
  const sourceType = articleMatch || mainMatch ? "article/main section" : "whole page";

  return {
    text: cleaned,
    extractionNotes: `Source: URL HTML fetch. Extraction quality: best-effort from ${sourceType}; may be partial depending on page structure.`
  };
}
