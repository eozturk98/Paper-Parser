import { cleanText } from "./utils.js";

export async function parseUploadedFile(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    const text = await file.text();
    return {
      text: cleanText(text),
      extractionNotes: "Source: uploaded .txt file. Extraction quality: high unless the file itself is incomplete."
    };
  }

  if (name.endsWith(".pdf")) {
    const buffer = await file.arrayBuffer();
    const text = extractTextFromPdfBuffer(buffer);
    const cleaned = cleanText(text);

    if (!cleaned) {
      throw new Error(
        "Could not extract readable text from this PDF. Try copy/paste text mode, URL mode, or another PDF version."
      );
    }

    return {
      text: cleaned,
      extractionNotes:
        "Source: uploaded .pdf file. Extraction quality: best-effort and possibly partial because PDF text layout can be complex."
    };
  }

  throw new Error("Unsupported file type. Please upload a .txt or .pdf file.");
}

export function extractTextFromPdfBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  const streamMatches = binary.match(/stream[\s\S]*?endstream/g) || [];
  const chunks = [];

  for (const stream of streamMatches) {
    const textObjectMatches = stream.match(/BT[\s\S]*?ET/g) || [];
    for (const obj of textObjectMatches) {
      const segments = [];

      const tjMatches = obj.match(/\((?:\\.|[^\\()])*\)\s*Tj/g) || [];
      for (const match of tjMatches) {
        const str = match.match(/\((?:\\.|[^\\()])*\)/)?.[0];
        if (str) {
          segments.push(decodePdfString(str));
        }
      }

      const tjArrayMatches = obj.match(/\[(?:[\s\S]*?)\]\s*TJ/g) || [];
      for (const match of tjArrayMatches) {
        const strings = match.match(/\((?:\\.|[^\\()])*\)/g) || [];
        for (const str of strings) {
          segments.push(decodePdfString(str));
        }
      }

      const joined = segments.join(" ").trim();
      if (joined) {
        chunks.push(joined);
      }
    }
  }

  return chunks.join("\n");
}

function decodePdfString(pdfStringLiteral) {
  const raw = pdfStringLiteral.slice(1, -1);
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
