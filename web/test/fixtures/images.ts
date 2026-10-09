// Minimal byte sequences that pass magic-byte sniffing in lib/upload-validation.ts.
export const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
// "RIFF" + size + "WEBP" + "VP8 "
export const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
])

export function jpegFile(name = "photo.jpg") {
  return new File([JPEG_BYTES], name, { type: "image/jpeg" })
}

export function pngFile(name = "photo.png") {
  return new File([PNG_BYTES], name, { type: "image/png" })
}

export function webpFile(name = "photo.webp") {
  return new File([WEBP_BYTES], name, { type: "image/webp" })
}

/** An HTML payload disguised as a JPEG (name + MIME lie). */
export function spoofedHtmlFile(name = "photo.jpg") {
  return new File(["<html><script>alert(1)</script></html>"], name, { type: "image/jpeg" })
}

/** A real JPEG-headed file of exactly `bytes` bytes (survives FormData/Request round-trips). */
export function bigJpegFile(bytes: number, name = "big.jpg") {
  const data = new Uint8Array(bytes)
  data.set(JPEG_BYTES)
  return new File([data], name, { type: "image/jpeg" })
}
