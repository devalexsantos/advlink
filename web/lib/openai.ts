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
