// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  MAX_IMAGE_BYTES,
  detectImageType,
  imageUploadErrorResponse,
  rejectOversizedRequest,
  validateImageUpload,
  validateImageUploads,
} from "@/lib/upload-validation"
import { JPEG_BYTES, PNG_BYTES, WEBP_BYTES, jpegFile, pngFile, spoofedHtmlFile, webpFile } from "@/test/fixtures/images"

describe("detectImageType", () => {
  it("detects jpeg, png and webp by magic bytes", () => {
    expect(detectImageType(JPEG_BYTES)).toBe("image/jpeg")
    expect(detectImageType(PNG_BYTES)).toBe("image/png")
    expect(detectImageType(WEBP_BYTES)).toBe("image/webp")
  })

  it("rejects unknown, truncated and non-WEBP RIFF content", () => {
    expect(detectImageType(new Uint8Array([]))).toBeNull()
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(detectImageType(new TextEncoder().encode("GIF89a......"))).toBeNull()
    expect(detectImageType(new TextEncoder().encode("RIFF\0\0\0\0WAVEfmt "))).toBeNull()
  })
})

describe("validateImageUpload", () => {
  it.each([
    ["jpeg", jpegFile(), "image/jpeg", "jpg"],
    ["png", pngFile(), "image/png", "png"],
    ["webp", webpFile(), "image/webp", "webp"],
  ])("accepts a valid %s and derives type/extension from the content", async (_label, file, type, ext) => {
    const result = await validateImageUpload(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.image.contentType).toBe(type)
    expect(result.image.ext).toBe(ext)
    expect(result.image.buffer.length).toBe(file.size)
  })

  it("ignores the client-provided name and MIME: a PNG sent as photo.jpg/image/jpeg is stored as png", async () => {
    const file = new File([PNG_BYTES], "photo.jpg", { type: "image/jpeg" })
    const result = await validateImageUpload(file)
    expect(result.ok && result.image.contentType).toBe("image/png")
    expect(result.ok && result.image.ext).toBe("png")
  })

  it("rejects HTML renamed to .jpg with image/jpeg type", async () => {
    const result = await validateImageUpload(spoofedHtmlFile())
    expect(result).toEqual({ ok: false, status: 400, error: expect.stringContaining("JPG, PNG ou WebP") })
  })

  it("rejects SVG renamed to .jpg with image/jpeg type", async () => {
    const svg = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      "logo.jpg",
      { type: "image/jpeg" },
    )
    const result = await validateImageUpload(svg)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })

  it("rejects a real SVG declared as image/svg+xml", async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "logo.svg", { type: "image/svg+xml" })
    const result = await validateImageUpload(svg)
    expect(result.ok).toBe(false)
  })

  it("rejects GIF", async () => {
    const gif = new File([new TextEncoder().encode("GIF89a\x01\x00\x01\x00")], "a.gif", { type: "image/gif" })
    expect((await validateImageUpload(gif)).ok).toBe(false)
  })

  it("rejects an empty file", async () => {
    const result = await validateImageUpload(new File([], "empty.jpg", { type: "image/jpeg" }))
    expect(result).toEqual({ ok: false, status: 400, error: "Arquivo de imagem vazio." })
  })

  it("returns 413 for an oversized file without reading its content", async () => {
    const file = jpegFile()
    Object.defineProperty(file, "size", { value: MAX_IMAGE_BYTES + 1 })
    let read = false
    Object.defineProperty(file, "arrayBuffer", {
      value: () => {
        read = true
        return Promise.resolve(new ArrayBuffer(0))
      },
    })
    const result = await validateImageUpload(file)
    expect(result).toEqual({ ok: false, status: 413, error: "Imagem muito grande. O tamanho máximo é 10 MB." })
    expect(read).toBe(false)
  })

  it("honours a custom maxBytes", async () => {
    const result = await validateImageUpload(jpegFile(), { maxBytes: 4 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })
})

describe("validateImageUploads", () => {
  it("validates every entry", async () => {
    const result = await validateImageUploads([jpegFile(), pngFile()], { maxFiles: 5 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.images.map((i) => i.ext)).toEqual(["jpg", "png"])
  })

  it("accepts an empty list", async () => {
    const result = await validateImageUploads([], { maxFiles: 5 })
    expect(result).toEqual({ ok: true, images: [] })
  })

  it("rejects too many files", async () => {
    const result = await validateImageUploads([jpegFile(), jpegFile(), jpegFile()], { maxFiles: 2 })
    expect(result).toEqual({ ok: false, status: 400, error: "Envie no máximo 2 imagens." })
  })

  it("rejects a string entry", async () => {
    const result = await validateImageUploads(["not-a-file"], { maxFiles: 2 })
    expect(result.ok).toBe(false)
  })

  it("rejects when any file is spoofed", async () => {
    const result = await validateImageUploads([jpegFile(), spoofedHtmlFile()], { maxFiles: 5 })
    expect(result.ok).toBe(false)
  })
})

describe("imageUploadErrorResponse", () => {
  it("maps the result to a JSON response", async () => {
    const res = imageUploadErrorResponse({ ok: false, status: 413, error: "x" })
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: "x" })
  })
})

describe("rejectOversizedRequest", () => {
  const req = (length?: string) =>
    new Request("http://localhost/api/x", {
      method: "POST",
      headers: length ? { "content-length": length } : {},
    })

  it("passes when there is no Content-Length", () => {
    expect(rejectOversizedRequest(req(), 100)).toBeNull()
  })

  it("passes within the limit (file bytes * count + 1 MB overhead)", () => {
    expect(rejectOversizedRequest(req(String(2 * 100 + 1024 * 1024)), 100, 2)).toBeNull()
  })

  it("returns 413 above the limit", async () => {
    const res = rejectOversizedRequest(req(String(MAX_IMAGE_BYTES + 2 * 1024 * 1024)), MAX_IMAGE_BYTES)
    expect(res?.status).toBe(413)
    expect((await res!.json()).error).toContain("10 MB")
  })
})
