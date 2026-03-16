import { describe, it, expect } from "vitest"
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_LABELS,
  DEFAULT_SECTION_ICONS,
  isBuiltInKey,
  isCustomKey,
  isValidSectionKey,
  getSectionOrder,
  getSectionLabel,
  getSectionIcon,
} from "@/lib/section-order"

describe("DEFAULT_SECTION_ORDER", () => {
  it("has 6 items in correct order", () => {
    expect(DEFAULT_SECTION_ORDER).toEqual([
      "servicos", "sobre", "galeria", "links", "calendly", "endereco",
    ])
  })
})

describe("isBuiltInKey()", () => {
  it("returns true for built-in keys", () => {
    expect(isBuiltInKey("servicos")).toBe(true)
    expect(isBuiltInKey("sobre")).toBe(true)
    expect(isBuiltInKey("endereco")).toBe(true)
  })

  it("returns false for custom or invalid keys", () => {
    expect(isBuiltInKey("custom_123")).toBe(false)
    expect(isBuiltInKey("random")).toBe(false)
  })
})

describe("isCustomKey()", () => {
  it("returns true for custom_ prefixed keys", () => {
    expect(isCustomKey("custom_123")).toBe(true)
    expect(isCustomKey("custom_abc")).toBe(true)
  })

  it("returns false for non-custom keys", () => {
    expect(isCustomKey("servicos")).toBe(false)
    expect(isCustomKey("random")).toBe(false)
  })
})

describe("isValidSectionKey()", () => {
  it("returns true for built-in and custom keys", () => {
    expect(isValidSectionKey("servicos")).toBe(true)
    expect(isValidSectionKey("custom_abc")).toBe(true)
  })

  it("returns false for invalid keys", () => {
    expect(isValidSectionKey("random")).toBe(false)
    expect(isValidSectionKey("")).toBe(false)
  })
})

describe("getSectionOrder()", () => {
  it("returns default for null", () => {
    expect(getSectionOrder(null)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it("returns default for undefined", () => {
    expect(getSectionOrder(undefined)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it("returns default for empty array", () => {
    expect(getSectionOrder([])).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it("preserves custom order and fills missing built-in keys", () => {
    const result = getSectionOrder(["galeria", "servicos"])
    expect(result[0]).toBe("galeria")
    expect(result[1]).toBe("servicos")
    // Remaining built-in keys should be appended
    expect(result).toContain("sobre")
    expect(result).toContain("links")
    expect(result).toContain("calendly")
    expect(result).toContain("endereco")
  })

  it("filters out invalid keys", () => {
    const result = getSectionOrder(["servicos", "invalid_key", "sobre"])
    expect(result).not.toContain("invalid_key")
    expect(result).toContain("servicos")
    expect(result).toContain("sobre")
  })

  it("preserves custom keys", () => {
    const result = getSectionOrder(["servicos", "custom_abc", "sobre"])
    expect(result).toContain("custom_abc")
  })
})

describe("getSectionLabel()", () => {
  it("returns default label for built-in key", () => {
    expect(getSectionLabel("servicos")).toBe("Serviços")
    expect(getSectionLabel("sobre")).toBe("Sobre")
  })

  it("returns custom label when provided", () => {
    expect(getSectionLabel("servicos", { servicos: "Áreas de Atuação" })).toBe("Áreas de Atuação")
  })

  it("returns the key itself for unknown custom key without label", () => {
    expect(getSectionLabel("custom_123" as never)).toBe("custom_123")
  })
})

describe("getSectionIcon()", () => {
  it("returns default icon for built-in key", () => {
    expect(getSectionIcon("servicos")).toBe("Scale")
    expect(getSectionIcon("galeria")).toBe("Images")
  })

  it("returns override icon when provided", () => {
    expect(getSectionIcon("servicos", { servicos: "Gavel" })).toBe("Gavel")
  })

  it("returns 'FileText' for custom key without override", () => {
    expect(getSectionIcon("custom_123" as never)).toBe("FileText")
  })
})
