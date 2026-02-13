import { legalConfig } from "./config";

export function chunkText(text: string) {
  const size = legalConfig.chunkSize;
  const overlap = legalConfig.chunkOverlap;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);
    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= text.length) break;
  }
  return chunks;
}
