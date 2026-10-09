import { NextResponse } from "next/server"

/**
 * Server-side validation for image uploads that end up in the public S3 bucket.
 *
 * Never trust `file.type` or `file.name`: both are client-controlled. The real type is
 * detected from the file's magic bytes and the S3 extension/content-type derive from it,
 * so an HTML/SVG renamed to `.jpg` with `image/jpeg` is rejected instead of being served
 * from the bucket.
 */

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES

const MB = 1024 * 1024

/**
 * Default limit for site images (avatar, cover, gallery, area/link covers, team avatars, custom
 * sections). Every one of those inputs accepts a raw photo straight from a phone camera (no
 * client-side compression), and the avatar/cover cropper re-encodes at the crop's native
 * resolution (JPEG 0.92), so 5 MB would reject common 12-48 MP photos.
 */
export const MAX_IMAGE_BYTES = 10 * MB

/** Support ticket attachments are screenshots: tighter limit and a cap on the count. */
export const MAX_TICKET_IMAGE_BYTES = 5 * MB
export const MAX_TICKET_IMAGES = 5

/** Multipart overhead tolerated on top of the file bytes when checking Content-Length. */
const MULTIPART_OVERHEAD_BYTES = 1 * MB

export type ValidatedImage = {
  buffer: Buffer
  contentType: AllowedImageType
  ext: (typeof ALLOWED_IMAGE_TYPES)[AllowedImageType]
  size: number
}

export type ImageValidationResult =
  | { ok: true; image: ValidatedImage }
  | { ok: false; status: 400 | 413; error: string }

export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= png.length && png.every((b, i) => bytes[i] === b)) {
    return "image/png"
  }
  // RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  return null
}

function formatMb(bytes: number) {
  return `${Math.round(bytes / MB)} MB`
}

export async function validateImageUpload(
  file: Blob,
  opts: { maxBytes?: number } = {},
): Promise<ImageValidationResult> {
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES

  // Size check happens before reading the content into memory.
  if (file.size === 0) {
    return { ok: false, status: 400, error: "Arquivo de imagem vazio." }
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Imagem muito grande. O tamanho máximo é ${formatMb(maxBytes)}.`,
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = detectImageType(buffer)
  if (!contentType) {
    return {
      ok: false,
      status: 400,
      error: "Formato de imagem não suportado. Envie um arquivo JPG, PNG ou WebP.",
    }
  }

  return {
    ok: true,
    image: { buffer, contentType, ext: ALLOWED_IMAGE_TYPES[contentType], size: buffer.length },
  }
}

/** Validates a multi-file field (e.g. `formData.getAll("images")`): count, type and size of each. */
export async function validateImageUploads(
  entries: FormDataEntryValue[],
  opts: { maxBytes?: number; maxFiles: number },
): Promise<{ ok: true; images: ValidatedImage[] } | Extract<ImageValidationResult, { ok: false }>> {
  if (entries.length > opts.maxFiles) {
    return { ok: false, status: 400, error: `Envie no máximo ${opts.maxFiles} imagens.` }
  }
  const images: ValidatedImage[] = []
  for (const entry of entries) {
    if (!(entry instanceof Blob)) {
      return { ok: false, status: 400, error: "Anexo inválido." }
    }
    const result = await validateImageUpload(entry, { maxBytes: opts.maxBytes })
    if (!result.ok) return result
    images.push(result.image)
  }
  return { ok: true, images }
}

export function imageUploadErrorResponse(result: Extract<ImageValidationResult, { ok: false }>) {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

/**
 * `req.formData()` buffers the whole body, so a huge upload would be read into memory before
 * `file.size` can be checked. Reject early based on Content-Length (when the client sends it).
 * Chunked requests without Content-Length still fall through to the per-file check.
 */
export function rejectOversizedRequest(req: Request, maxFileBytes: number, maxFiles = 1) {
  const raw = req.headers.get("content-length")
  if (!raw) return null
  const length = Number(raw)
  if (!Number.isFinite(length)) return null
  const limit = maxFileBytes * maxFiles + MULTIPART_OVERHEAD_BYTES
  if (length > limit) {
    return NextResponse.json(
      { error: `Envio muito grande. O tamanho máximo por imagem é ${formatMb(maxFileBytes)}.` },
      { status: 413 },
    )
  }
  return null
}
