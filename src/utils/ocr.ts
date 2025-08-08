import Tesseract from "tesseract.js";

export async function runOCR(file: File): Promise<string> {
  const { data } = await Tesseract.recognize(file, 'eng');
  // Normalize whitespace and lines
  const text = data.text || '';
  return text.replace(/\s+/g, ' ').trim();
}
