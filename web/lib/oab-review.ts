/**
 * Revisor orientativo de publicidade (Provimento OAB 205/2021).
 * Função pura: não bloqueia nada, apenas aponta termos que merecem atenção.
 */

export type OabFinding = { rule: string; term: string; message: string }

type Rule = { rule: string; message: string; pattern: RegExp }

const RULES: Rule[] = [
  {
    rule: "especialista",
    message: "Só use se tiver título de especialização reconhecido (art. 3º, III).",
    pattern: /\bespecializad[oa]s?\b|\bespecialistas?\b/g,
  },
  {
    rule: "promessa-de-resultado",
    message: "Não prometa resultados (art. 6º).",
    pattern:
      /\b(?:resultados?|sucesso|exito|vitoria|ganho de causa) garantid[oa]s?\b|\bgarantia (?:de|do) (?:resultado|sucesso|exito|vitoria)\b|\bcausa ganha\b|\bgarantimos\b|\b100\s?%/g,
  },
  {
    rule: "honorarios-gratuidade",
    message: "Não mencione honorários, gratuidade ou descontos (art. 3º, I).",
    pattern: /\bconsulta gratuita\b|\bgratuitos?\b|\bgratis\b|\bdescontos?\b|\bparcelamos\b|\bpromocao\b|\br\$\s?\d[\d.,]*/g,
  },
  {
    rule: "superioridade",
    message: "Evite expressões de superioridade ou autopromoção (art. 3º, IV).",
    pattern:
      /\bos melhores\b|\bo melhor\b|\ba melhor\b|\blider\b|\bnumero 1\b|\bn[º°]\s?1\b|\bn\.\s?1\b|\breferencia em\b/g,
  },
  {
    rule: "captacao",
    message: "Evite chamadas que incitem a contratação (art. 3º, §1º).",
    pattern:
      /\bentre em contato agora\b|\bligue agora\b|\bchame agora\b|\bnao perca\b|\bprocesse ja\b|\bcontrate ja\b|\bfale conosco agora\b/g,
  },
  {
    rule: "caso-concreto",
    message:
      "Responda sempre de forma geral: responder habitualmente a casos concretos por meios de comunicação é vedado (CED, art. 42, I).",
    pattern: /\banalisamos (?:o )?seu caso\b|\banalise do seu caso\b|\bno seu caso\b|\bseu caso\b/g,
  },
  {
    rule: "numero-de-processo",
    message: "Não divulgue números de processos (sigilo profissional).",
    pattern: /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g,
  },
]

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
}

function normalize(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function reviewText(input: string): OabFinding[] {
  if (!input) return []
  const text = normalize(input)
  const seen = new Set<string>()
  const findings: OabFinding[] = []
  for (const { rule, message, pattern } of RULES) {
    for (const match of text.matchAll(pattern)) {
      const term = match[0].trim()
      const key = `${rule}|${term}`
      if (seen.has(key)) continue
      seen.add(key)
      findings.push({ rule, term, message })
    }
  }
  return findings
}
