import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateActivityDescriptions } from "@/lib/openai"

describe("generateActivityDescriptions()", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("throws without API key", async () => {
    await expect(generateActivityDescriptions(["Direito Civil"], "")).rejects.toThrow("Missing OPENAI_API_KEY")
  })

  it("uses batch mode for ≤3 titles", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              descriptions: ["Desc Civil", "Desc Penal"],
            }),
          },
        }],
      }),
      text: () => Promise.resolve(""),
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as Response)

    const result = await generateActivityDescriptions(["Civil", "Penal"], "sk-test")
    expect(result).toHaveLength(2)
    expect(result[0]).toBe("Desc Civil")
    expect(result[1]).toBe("Desc Penal")
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it("uses per-item mode for >3 titles", async () => {
    const titles = ["A", "B", "C", "D"]
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: "Description text" } }],
      }),
    } as Response)

    const result = await generateActivityDescriptions(titles, "sk-test")
    expect(result).toHaveLength(4)
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it("truncates descriptions to 2000 chars", async () => {
    const longDesc = "x".repeat(3000)
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ descriptions: [longDesc] }),
          },
        }],
      }),
    } as Response)

    const result = await generateActivityDescriptions(["Test"], "sk-test")
    expect(result[0].length).toBeLessThanOrEqual(2000)
  })

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    } as Response)

    await expect(generateActivityDescriptions(["Test"], "sk-test")).rejects.toThrow("OpenAI error: 429")
  })

  it("pads missing descriptions with empty strings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({ descriptions: ["Only one"] }),
          },
        }],
      }),
    } as Response)

    const result = await generateActivityDescriptions(["A", "B", "C"], "sk-test")
    expect(result).toHaveLength(3)
    expect(result[0]).toBe("Only one")
    expect(result[1]).toBe("")
    expect(result[2]).toBe("")
  })
})
