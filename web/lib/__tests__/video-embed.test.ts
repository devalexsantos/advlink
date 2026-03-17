import { describe, it, expect } from "vitest"
import { getVideoEmbedUrl } from "@/lib/video-embed"

describe("getVideoEmbedUrl", () => {
  describe("YouTube", () => {
    it("parses youtube.com/watch?v=ID", () => {
      const result = getVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
      expect(result).toEqual({ provider: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" })
    })

    it("parses youtu.be/ID", () => {
      const result = getVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")
      expect(result).toEqual({ provider: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" })
    })

    it("parses youtube.com/embed/ID", () => {
      const result = getVideoEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")
      expect(result).toEqual({ provider: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" })
    })

    it("handles extra query params", () => {
      const result = getVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=abc")
      expect(result).toEqual({ provider: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" })
    })
  })

  describe("Vimeo", () => {
    it("parses vimeo.com/ID", () => {
      const result = getVideoEmbedUrl("https://vimeo.com/123456789")
      expect(result).toEqual({ provider: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" })
    })

    it("parses player.vimeo.com/video/ID", () => {
      const result = getVideoEmbedUrl("https://player.vimeo.com/video/123456789")
      expect(result).toEqual({ provider: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" })
    })
  })

  describe("Invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(getVideoEmbedUrl("")).toBeNull()
    })

    it("returns null for random URL", () => {
      expect(getVideoEmbedUrl("https://example.com/video")).toBeNull()
    })

    it("returns null for non-URL text", () => {
      expect(getVideoEmbedUrl("not a url")).toBeNull()
    })

    it("returns null for undefined-like input", () => {
      expect(getVideoEmbedUrl("" as string)).toBeNull()
    })
  })
})
