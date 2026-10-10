import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateActivityDescriptions, generateAreaFaqs } from "@/lib/openai"

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

  it("truncates batch descriptions to 1200 chars", async () => {
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
    expect(result[0]).toHaveLength(1200)
  })

  it("truncates per-item descriptions to 1200 chars", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: "y".repeat(3000) } }],
      }),
    } as Response)

    const result = await generateActivityDescriptions(["A", "B", "C", "D"], "sk-test")
    for (const d of result) expect(d).toHaveLength(1200)
  })

  describe("OAB-compliant prompts (Provimento 205/2021)", () => {
    function sentBodies() {
      return vi.mocked(globalThis.fetch).mock.calls.map(
        ([, init]) => JSON.parse(String((init as RequestInit).body)) as {
          max_tokens: number
          messages: { role: string; content: string }[]
        }
      )
    }

    function assertCompliant(messages: { content: string }[]) {
      const text = messages.map((m) => m.content).join("\n").toLowerCase()
      expect(text).not.toContain("persuasiv")
      expect(text).not.toContain("oferecer seus serviços")
      expect(text).not.toContain("chamada para")
      expect(text).toContain("não inclua chamada à ação de contato ou contratação")
    }

    it("batch prompt is informative, forbids contact CTA and uses 1800 max_tokens", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify({ descriptions: ["a", "b"] }) } }],
        }),
      } as Response)

      await generateActivityDescriptions(["Civil", "Penal"], "sk-test")
      const [body] = sentBodies()
      expect(body.max_tokens).toBe(1800)
      assertCompliant(body.messages)
      const user = body.messages.find((m) => m.role === "user")!.content
      expect(user).toContain("400 e 900 caracteres")
      expect(user).toContain('"especialista"')
      expect(user).toContain("honorários")
    })

    it("per-item prompt carries the same rules and uses 700 max_tokens", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "ok" } }] }),
      } as Response)

      await generateActivityDescriptions(["A", "B", "C", "D"], "sk-test")
      const bodies = sentBodies()
      expect(bodies).toHaveLength(4)
      for (const body of bodies) {
        expect(body.max_tokens).toBe(700)
        assertCompliant(body.messages)
        const user = body.messages.find((m) => m.role === "user")!.content
        expect(user).toContain("400 e 900 caracteres")
        expect(user).toContain('"especialista"')
      }
    })
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

describe("generateAreaFaqs()", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockContent(content: string) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content } }] }),
      text: () => Promise.resolve(""),
    } as Response)
  }

  function sentBody() {
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]
    return JSON.parse(String((init as RequestInit).body)) as {
      max_tokens: number
      temperature: number
      response_format: { type: string }
      messages: { role: string; content: string }[]
    }
  }

  it("throws without API key", async () => {
    await expect(generateAreaFaqs("Direito Civil", "")).rejects.toThrow("Missing OPENAI_API_KEY")
  })

  it("parses the faqs from JSON mode", async () => {
    mockContent(JSON.stringify({ faqs: [{ question: "O que é?", answer: "É um ramo do Direito." }, { question: "Q2?", answer: "A2." }] }))
    const result = await generateAreaFaqs("Direito Civil", "sk-test")
    expect(result).toEqual([
      { question: "O que é?", answer: "É um ramo do Direito." },
      { question: "Q2?", answer: "A2." },
    ])
    const body = sentBody()
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.max_tokens).toBe(1500)
    expect(body.temperature).toBe(0.5)
  })

  it("drops empty items, strips HTML/Markdown, trims, caps lengths and the count", async () => {
    mockContent(
      JSON.stringify({
        faqs: [
          { question: "  <b>Pergunta</b>  ", answer: " **Resposta** " },
          { question: "", answer: "sem pergunta" },
          { question: "sem resposta", answer: "   " },
          null,
          "texto solto",
          { question: "q".repeat(300), answer: "a".repeat(1000) },
          { question: "3", answer: "3" },
          { question: "4", answer: "4" },
          { question: "5", answer: "5" },
          { question: "6", answer: "6" },
        ],
      }),
    )
    const result = await generateAreaFaqs("Família", "sk-test")
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual({ question: "Pergunta", answer: "Resposta" })
    expect(result[1].question).toHaveLength(150)
    expect(result[1].answer).toHaveLength(700)
    expect(result.map((f) => f.question).slice(2)).toEqual(["3", "4", "5"])
  })

  it("returns [] for malformed JSON or a missing faqs array", async () => {
    mockContent("not json")
    expect(await generateAreaFaqs("Penal", "sk-test")).toEqual([])
    vi.restoreAllMocks()
    mockContent(JSON.stringify({ items: [] }))
    expect(await generateAreaFaqs("Penal", "sk-test")).toEqual([])
  })

  it("prompt carries the OAB rules (general answers, no concrete case, no CTA, no law numbers)", async () => {
    mockContent(JSON.stringify({ faqs: [] }))
    await generateAreaFaqs("Direito do Consumidor", "sk-test")
    const { messages } = sentBody()
    const system = messages.find((m) => m.role === "system")!.content
    const user = messages.find((m) => m.role === "user")!.content
    expect(system).toContain("Provimento OAB 205/2021")
    expect(user).toContain('"Direito do Consumidor"')
    expect(user).toContain("3 a 5 perguntas")
    expect(user).toContain("200 e 500 caracteres")
    expect(user).toContain("NUNCA analise ou opine sobre um caso concreto")
    expect(user).toContain('"no seu caso"')
    expect(user).toContain("Não recomende contratar")
    expect(user).toContain("Não inclua chamada à ação de contato ou contratação")
    expect(user).toContain("Não prometa")
    expect(user).toContain("gratuidade")
    expect(user).toContain('"especialista"')
    expect(user).toContain("Não cite números de artigos nem números de leis")
    expect(user).toContain("Direito brasileiro")
    expect(user).toContain("sem Markdown")
  })

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
    } as Response)
    await expect(generateAreaFaqs("Civil", "sk-test")).rejects.toThrow("OpenAI error: 500")
  })
})
