const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF, needs WEBP at offset 8
  { mime: "image/bmp", bytes: [0x42, 0x4d] },
  { mime: "image/tiff", bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mime: "image/tiff", bytes: [0x4d, 0x4d, 0x00, 0x2a] },
];

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function matchesSignature(buffer: Buffer, signature: number[], offset = 0) {
  if (buffer.length < signature.length + offset) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[i + offset] !== signature[i]) return false;
  }
  return true;
}

export function sniffMimeType(buffer: Buffer) {
  if (matchesSignature(buffer, PDF_SIGNATURE)) {
    return "application/pdf";
  }

  for (const sig of IMAGE_SIGNATURES) {
    if (matchesSignature(buffer, sig.bytes)) {
      if (sig.mime === "image/webp") {
        if (matchesSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
          return "image/webp";
        }
        continue;
      }
      return sig.mime;
    }
  }

  return null;
}

export function isAllowedMime(mime: string | null) {
  if (!mime) return false;
  return mime === "application/pdf" || mime.startsWith("image/");
}
