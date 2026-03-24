export function cleanText(raw) {
  return (raw || "")
    .replace(/\r/g, "")
    .replace(/\t+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateForModel(text, maxChars = 120000) {
  if (!text || text.length <= maxChars) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, maxChars)}\n\n[TRUNCATED: input exceeded ${maxChars} characters]`,
    truncated: true
  };
}

export function isValidHttpUrl(candidate) {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
