import { PAPER_ANALYSIS_SYSTEM_PROMPT, buildUserPrompt } from "./promptTemplate.js";
import { truncateForModel } from "./utils.js";

export async function analyzePaper({ paperText, extractionNotes, apiKey, model, apiBaseUrl }) {
  if (!apiKey) {
    throw new Error("Missing API key. Add it in the AI Settings section.");
  }

  const normalizedBase = (apiBaseUrl || "https://api.openai.com").replace(/\/$/, "");
  const endpoint = `${normalizedBase}/v1/chat/completions`;

  const trimmedInput = truncateForModel(paperText, 120000);
  const fullNotes = [
    extractionNotes,
    trimmedInput.truncated
      ? "Input had to be truncated due to model limits. Analysis only covers the visible part that was sent."
      : "Input was sent without truncation."
  ].join(" ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: PAPER_ANALYSIS_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildUserPrompt(trimmedInput.text, fullNotes)
        }
      ]
    })
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Model call failed with status ${response.status}. Response was not JSON.`);
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Model call failed (${response.status}).`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model response was empty.");
  }

  return content;
}
