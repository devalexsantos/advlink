export const meta = {
  name: 'audit',
  description: 'Auditoria read-only do AdvLink (segurança, billing, SEO/growth, UX) com verificação adversarial e relatório em docs/',
  whenToUse: 'Retomada do projeto, antes de releases grandes ou antes de divulgar. args: { date: "AAAA-MM-DD", focus?: string }',
  phases: [
    { title: 'Find', detail: '4 auditores em paralelo, um por dimensão (read-only)' },
    { title: 'Verify', detail: 'um cético por dimensão tenta refutar cada achado' },
    { title: 'Report', detail: 'consolida e grava docs/audit-<data>.md' },
  ],
}

const date = (args && args.date) || 'sem-data'
const focus = args && args.focus ? `\nFoco extra pedido pelo usuário: ${args.focus}` : ''

const READ_ONLY = 'Você está em modo SOMENTE LEITURA: não edite, crie ou apague arquivos, não rode comandos que alterem estado (git commit, npm install, prisma migrate/db push, requests POST). Use Read/Grep/Glob e Bash apenas para leitura.'

const DIMENSIONS = [
  { key: 'security', agentFile: 'security-auditor',
    scope: 'Segurança: segredos com fallback, authN/authZ e IDOR multi-site (getActiveSiteId/profileId), XSS armazenado (render-content, dangerouslySetInnerHTML, gtmContainerId), uploads S3 (MIME/tamanho), rate limiting, webhook Stripe, headers/cookies, npm audit (high/critical).' },
  { key: 'billing', agentFile: 'billing-specialist',
    scope: 'Billing e ativação: checkout → webhook → Profile.isActive, idempotência e ordem de eventos, past_due/unpaid, invoice.payment_failed, cancelamento/reativação por site (multi-site), UX pós-checkout (?success=1), e-mails de cobrança.' },
  { key: 'seo-growth', agentFile: 'seo-growth',
    scope: 'SEO técnico e aquisição: web/app/adv/[slug] (metadata, canonical, 404 real, noindex de inativos, JSON-LD), robots/sitemap em web, lp e blog, OG, UTM e captura de leads na LP, newsletter do blog (persistência), funil LP → cadastro.' },
  { key: 'ux-funnel', agentFile: 'ux-analyst',
    scope: 'Funil do usuário: login (magic link/Google) → onboarding (/onboarding/new-site, /onboarding/profile) → editor → assinatura → site no ar. Pontos onde o usuário trava, se perde ou recebe erro silencioso; links quebrados entre subdomínio e app; estados vazios/carregamento; mobile.' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'curto, ex: SEC-1' },
          severity: { type: 'string', enum: ['critico', 'alto', 'medio', 'baixo'] },
          title: { type: 'string' },
          locations: { type: 'array', items: { type: 'string' }, description: 'arquivo:linha' },
          scenario: { type: 'string', description: 'cenário concreto de falha/exploração' },
          fix: { type: 'string', description: 'correção recomendada, curta' },
          effort: { type: 'string', enum: ['P', 'M', 'G'] },
        },
        required: ['id', 'severity', 'title', 'locations', 'scenario', 'fix', 'effort'],
      },
    },
  },
  required: ['findings'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['confirmado', 'plausivel', 'refutado'] },
          severity: { type: 'string', enum: ['critico', 'alto', 'medio', 'baixo'] },
          note: { type: 'string', description: 'evidência curta para o veredito, com arquivo:linha' },
        },
        required: ['id', 'verdict', 'severity', 'note'],
      },
    },
  },
  required: ['verdicts'],
}

const results = await pipeline(
  DIMENSIONS,
  d => agent(
    `Leia e adote as instruções do agente em .claude/agents/${d.agentFile}.md (ignore o frontmatter).\n${READ_ONLY}\n\nAudite o AdvLink na dimensão:\n${d.scope}${focus}\n\nRegras: cada achado precisa de arquivo:linha verificado lendo o código e de um cenário concreto. Não reporte estilo/preferência. Prefira 5–15 achados relevantes a uma lista longa. Prefixe ids com ${d.key.toUpperCase().slice(0, 3)}-.`,
    { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS },
  ),
  (found, d) => {
    if (!found || !found.findings.length) return { dimension: d.key, findings: [], verdicts: [] }
    return agent(
      `${READ_ONLY}\n\nVocê é um revisor cético. Para CADA achado abaixo (dimensão ${d.key} do AdvLink), abra os arquivos citados e tente REFUTAR: o código realmente faz isso? Há proteção em outro lugar (proxy.ts, validação upstream, config)? O cenário é alcançável em produção? Ajuste a severidade se estiver inflada ou subestimada. Na dúvida sem evidência, use "plausivel".\n\nAchados:\n${JSON.stringify(found.findings, null, 2)}`,
      { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICTS },
    ).then(v => ({ dimension: d.key, findings: found.findings, verdicts: v ? v.verdicts : [] }))
  },
)

const merged = results.filter(Boolean).flatMap(r => r.findings.map(f => {
  const v = r.verdicts.find(x => x.id === f.id)
  return { ...f, dimension: r.dimension, verdict: v ? v.verdict : 'nao-verificado', severity: v ? v.severity : f.severity, verifyNote: v ? v.note : '' }
}))
const kept = merged.filter(f => f.verdict !== 'refutado')
log(`${merged.length} achados, ${merged.length - kept.length} refutados, ${kept.length} no relatório`)

phase('Report')
const reportPath = `docs/audit-${date}.md`
await agent(
  `Escreva o relatório de auditoria do AdvLink em pt-BR no arquivo ${reportPath} (crie o arquivo; é o ÚNICO arquivo que você pode escrever). Não altere código.\n\nEstrutura:\n1. Resumo executivo (5 linhas: estado geral, o que bloqueia divulgação).\n2. Tabela priorizada de todos os achados (ordem: crítico → baixo; dentro da severidade, menor esforço primeiro): id, severidade, dimensão, título, local, esforço, veredito.\n3. Detalhe por achado: cenário, correção recomendada, nota do verificador.\n4. Plano de ataque sugerido em 3 ondas (Estabilizar / Garantir funcionamento / Crescer), indicando qual agent do .claude/agents executa cada item.\n5. Apêndice: achados refutados (id + motivo), para não serem re-investigados.\n\nAchados mantidos:\n${JSON.stringify(kept, null, 2)}\n\nRefutados:\n${JSON.stringify(merged.filter(f => f.verdict === 'refutado').map(f => ({ id: f.id, title: f.title, note: f.verifyNote })), null, 2)}`,
  { label: 'report', phase: 'Report' },
)

return { reportPath, total: merged.length, kept: kept.length, bySeverity: ['critico', 'alto', 'medio', 'baixo'].map(s => [s, kept.filter(f => f.severity === s).length]) }
