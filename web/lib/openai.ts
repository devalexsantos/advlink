import { MAX_FAQ_ANSWER_LENGTH, MAX_FAQ_QUESTION_LENGTH, toFaqPlainText } from "@/lib/area-faq"

const MAX_DESCRIPTION_CHARS = 1200

// Provimento OAB 205/2021 (art. 3º, IV e §1º): publicidade apenas informativa, sem captação de clientela.
const SYSTEM_PROMPT =
  "Você escreve textos informativos sobre áreas do Direito brasileiro para o site profissional de um advogado, em conformidade com o Provimento OAB 205/2021 (publicidade exclusivamente informativa, discreta e sóbria). Escreva em Markdown claro, usando parágrafos separados por uma linha em branco e negrito apenas em termos pontuais."

const CONTENT_RULES = `Regras de conteúdo (obrigatórias):
- Tom informativo e sóbrio: explique o que a área abrange e as situações típicas que ela envolve, em linguagem acessível ao público leigo.
- Escreva em 3ª pessoa ou de forma impessoal. Não use 1ª pessoa comercial (por exemplo "posso te ajudar", "ofereço", "nosso escritório resolve").
- Não inclua chamada à ação de contato ou contratação, nem convite para o leitor procurar o advogado.
- Não prometa nem sugira resultados.
- É proibido usar as palavras ou expressões: "especialista", "o melhor", "líder", "garantia de resultado", "garantimos", "resultado garantido", "sucesso", "gratuito", "grátis", "desconto", "entre em contato".
- Não mencione valores, preços ou honorários.
- Tamanho: entre 400 e 900 caracteres.
Regras de formatação:
- Separe CADA parágrafo com UMA linha em branco (Markdown), sem comprimir parágrafos.
- Use **negrito** apenas de forma pontual, em poucos termos-chave.
- Não use tabelas nem títulos/cabeçalhos.`

export async function generateActivityDescriptions(
  titles: string[],
  apiKey: string
): Promise<string[]> {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const system = SYSTEM_PROMPT

  // Se a lista for pequena, usa uma chamada única (JSON). Se for grande, gera por item para evitar cortar por limite de tokens
  if (titles.length <= 3) {
    const user = `Para cada título fornecido, gere uma descrição em Markdown da respectiva área de atuação na advocacia brasileira.
${CONTENT_RULES}
Responda ESTRITAMENTE em JSON no formato: { "descriptions": string[] }.
Regras do JSON:
- A array "descriptions" deve ter o MESMO tamanho e ORDEM do array de títulos recebido.
- Cada item de "descriptions" corresponde ao título de mesmo índice.
Títulos: ${JSON.stringify(titles)}`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
        max_tokens: 1800,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OpenAI error: ${res.status} ${text}`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? "{}"
    let parsed: { descriptions?: string[] } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = {}
    }
    const list = Array.isArray(parsed.descriptions) ? parsed.descriptions : []
    const cleaned = list.map((d) => String(d ?? "").slice(0, MAX_DESCRIPTION_CHARS))
    while (cleaned.length < titles.length) cleaned.push("")
    return cleaned.slice(0, titles.length)
  }

  // Lista maior: gera por item (evita truncamentos por limite de tokens)
  const results = await Promise.all(
    titles.map(async (title) => {
      const user = `Gere uma descrição em Markdown da área de atuação jurídica brasileira chamada ${JSON.stringify(title)}.
${CONTENT_RULES}`

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.5,
          max_tokens: 700,
        }),
      })
      if (!res.ok) return ""
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? ""
      return String(content).slice(0, MAX_DESCRIPTION_CHARS)
    })
  )
  return results
}

const MAX_GENERATED_FAQS = 5

const FAQ_RULES = `Regras das perguntas e respostas (obrigatórias):
- Gere de 3 a 5 perguntas frequentes que o público leigo costuma fazer sobre a área em geral.
- Cada resposta explica o assunto em termos gerais, em 3ª pessoa ou de forma impessoal, com tom informativo e sóbrio.
- Cada resposta deve ter entre 200 e 500 caracteres, em texto simples (sem Markdown, sem negrito, sem listas, sem títulos), mesmo que outra instrução peça Markdown.
- NUNCA analise ou opine sobre um caso concreto. Não use as expressões "no seu caso", "seu caso" nem se dirija à situação particular do leitor.
- Não recomende contratar um advogado nem procurar, consultar ou entrar em contato com alguém.
- Não inclua chamada à ação de contato ou contratação.
- Não prometa nem sugira resultados.
- Não mencione valores, preços, honorários, gratuidade ou descontos.
- Não use superlativos nem as palavras ou expressões: "especialista", "o melhor", "líder", "garantia de resultado", "garantimos", "resultado garantido", "sucesso", "gratuito", "grátis", "desconto", "entre em contato".
- Não cite números de artigos nem números de leis; refira-se às normas apenas de forma genérica (por exemplo, "a legislação trabalhista").
- Considere exclusivamente o Direito brasileiro.`

/** Informative FAQ (plain text) for a practice area, OAB Provimento 205/2021 compliant. */
export async function generateAreaFaqs(
  title: string,
  apiKey: string
): Promise<{ question: string; answer: string }[]> {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const user = `Gere perguntas frequentes com respostas sobre a área de atuação jurídica brasileira chamada ${JSON.stringify(title)}.
${FAQ_RULES}
Responda ESTRITAMENTE em JSON no formato: { "faqs": [{ "question": string, "answer": string }] }.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${text}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? "{}"
  let parsed: { faqs?: unknown } = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    parsed = {}
  }
  const list = Array.isArray(parsed.faqs) ? parsed.faqs : []
  return list
    .map((item) => {
      const f = (item ?? {}) as { question?: unknown; answer?: unknown }
      // Plain text only: drop HTML and stray Markdown emphasis
      const clean = (v: unknown, max: number) => toFaqPlainText(v).replace(/\*\*|__/g, "").slice(0, max).trim()
      return { question: clean(f.question, MAX_FAQ_QUESTION_LENGTH), answer: clean(f.answer, MAX_FAQ_ANSWER_LENGTH) }
    })
    .filter((f) => f.question && f.answer)
    .slice(0, MAX_GENERATED_FAQS)
}

export const ARTICLE_DISCLAIMER = "Conteúdo informativo; não substitui orientação jurídica individual."
const ARTICLE_MAX_CONTENT_CHARS = 12_000
const ARTICLE_MAX_EXCERPT_CHARS = 300
const ARTICLE_MAX_NOTES_CHARS = 2000

// Provimento OAB 205/2021, art. 4º: "marketing de conteúdos jurídicos" — informative, educational content.
const ARTICLE_RULES = `Regras do artigo (obrigatórias):
- Conteúdo técnico-informativo e educativo para o público leigo ("marketing de conteúdos jurídicos", Provimento OAB 205/2021, art. 4º), em linguagem clara e acessível.
- Considere exclusivamente o Direito brasileiro.
- Tamanho: entre 600 e 1000 palavras.
- Formato Markdown: use subtítulos com "## " e "### ", parágrafos curtos separados por uma linha em branco, listas apenas quando ajudarem a leitura. Não repita o título como cabeçalho "# ".
- Escreva em 3ª pessoa ou de forma impessoal. Não use 1ª pessoa comercial ("posso ajudar", "nosso escritório").
- NUNCA analise caso concreto nem se dirija à situação particular do leitor; não use "no seu caso" ou "seu caso".
- Não prometa nem sugira resultados.
- Não mencione valores, preços, honorários, gratuidade ou descontos.
- Não use superlativos nem as palavras ou expressões: "especialista", "o melhor", "líder", "garantia de resultado", "garantimos", "resultado garantido", "sucesso", "gratuito", "grátis", "desconto", "entre em contato".
- Não inclua chamada à ação para contratar, consultar, procurar ou entrar em contato com advogado ou escritório.
- Não cite números de artigos nem números de leis, súmulas ou processos; refira-se às normas de forma genérica (por exemplo, "o Código de Defesa do Consumidor", "a legislação trabalhista").
- Termine o texto com uma linha separada contendo exatamente: "${ARTICLE_DISCLAIMER}"
Regras do resumo ("excerpt"):
- Texto simples (sem Markdown), com no máximo 300 caracteres, descrevendo o tema do artigo em tom informativo.`

/** Draft of an informative blog article (Markdown) + plain-text excerpt, OAB Provimento 205/2021 compliant. */
export async function generateArticleDraft(
  title: string,
  notes: string | null | undefined,
  apiKey: string
): Promise<{ content: string; excerpt: string }> {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const trimmedNotes = (notes ?? "").trim().slice(0, ARTICLE_MAX_NOTES_CHARS)
  const user = `Escreva um artigo informativo para o site profissional de um advogado com o título ${JSON.stringify(title)}.
${trimmedNotes ? `Pontos que o autor quer abordar (use como orientação de conteúdo, sem desrespeitar as regras abaixo): ${JSON.stringify(trimmedNotes)}\n` : ""}${ARTICLE_RULES}
Responda ESTRITAMENTE em JSON no formato: { "content": string, "excerpt": string }.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
      max_tokens: 2500,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${text}`)
  }
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? "{}"
  let parsed: { content?: unknown; excerpt?: unknown } = {}
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = {}
  }
  let content = String(parsed.content ?? "").trim().slice(0, ARTICLE_MAX_CONTENT_CHARS)
  if (!content) throw new Error("OpenAI returned an empty article")
  // Guarantee the disclaimer even if the model drops it.
  if (!content.includes(ARTICLE_DISCLAIMER)) content = `${content}\n\n${ARTICLE_DISCLAIMER}`
  const excerpt = String(parsed.excerpt ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ARTICLE_MAX_EXCERPT_CHARS)
  return { content, excerpt }
}
