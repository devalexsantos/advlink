export async function generateActivityDescriptions(
  titles: string[],
  apiKey: string
): Promise<string[]> {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const system = "Você é um advogado brasileiro experiente. Escreva em Markdown claro e persuasivo, usando parágrafos separados por uma linha em branco e pontos-chave em **negrito**."

  // Se a lista for pequena, usa uma chamada única (JSON). Se for grande, gera por item para evitar cortar por limite de tokens
  if (titles.length <= 3) {
    const user = `Para cada título fornecido, gere uma descrição em Markdown (1000–2000 caracteres) para a área de atuação na advocacia brasileira e também como forma de oferecer seus serviços citando exemplos de como você pode ajudar.
Regras de formatação:
- Separe CADA parágrafo com UMA linha em branco (Markdown), sem comprimir parágrafos.
- Destaque pontos importantes em **negrito**.
- Não use tabelas nem cabeçalhos desnecessários.
Responda ESTRITAMENTE em JSON no formato: { "descriptions": string[] }.
Regras:
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
        max_tokens: 3200,
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
    const cleaned = list.map((d) => String(d ?? "").slice(0, 2000))
    while (cleaned.length < titles.length) cleaned.push("")
    return cleaned.slice(0, titles.length)
  }

  // Lista maior: gera por item (evita truncamentos por limite de tokens)
  const results = await Promise.all(
    titles.map(async (title) => {
      const user = `Gere uma descrição em Markdown (1000–2000 caracteres) para a área de atuação jurídica brasileira chamada "${title}" e como forma de oferecer seus serviços de advocacia citando exemplos de como você pode ajudar. Ao final sempre termine com uma chamada para o leitor entrar em contato com você para resolver algum problema relacionado á area de atuação.
Regras de formatação:
- Separe CADA parágrafo com UMA linha em branco (Markdown), sem comprimir parágrafos.
- Destaque pontos importantes em **negrito**.
- Não use tabelas nem cabeçalhos desnecessários.`

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
          max_tokens: 1200,
        }),
      })
      if (!res.ok) return ""
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? ""
      return String(content).slice(0, 2000)
    })
  )
  return results
}

// Removido: geração de imagens de capa por IA


