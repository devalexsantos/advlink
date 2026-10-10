export const meta = {
  name: 'launch-readiness',
  description: 'Checklist de go-live do AdvLink: produção, config, billing, e-mails, SEO e funil → relatório pronto/não pronto',
  whenToUse: 'Antes de começar a divulgação ou após um ciclo de correções. args: { date: "AAAA-MM-DD", demoSlug?: "teste" }',
  phases: [
    { title: 'Check', detail: 'checagens independentes em paralelo' },
    { title: 'Report', detail: 'veredito e docs/launch-readiness-<data>.md' },
  ],
}

const date = (args && args.date) || 'sem-data'
const demoSlug = (args && args.demoSlug) || 'teste'
const RO = 'SOMENTE LEITURA: não edite arquivos e não faça requisições que alterem estado (só GET/HEAD em produção).'

const CHECK = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    status: { type: 'string', enum: ['pronto', 'com-ressalvas', 'bloqueante'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          check: { type: 'string' }, ok: { type: 'boolean' }, evidence: { type: 'string' }, action: { type: 'string' },
        },
        required: ['check', 'ok', 'evidence', 'action'],
      },
    },
  },
  required: ['area', 'status', 'items'],
}

const CHECKS = [
  { key: 'producao', prompt: `Execute .claude/skills/prod-smoke/SKILL.md contra produção usando o slug de demo "${demoSlug}". ${RO}` },
  { key: 'config', prompt: `${RO} Verifique prontidão de configuração: toda env usada em web/ (grep process.env) está em web/.env.example; fallbacks inseguros (|| "...") para segredos; Dockerfiles (web, lp, blog) — versão do Node, migrations no boot, env da newsletter do blog (RESEND_API_KEY, RESEND_SEGMENT_ID, NEWSLETTER_FROM, NEWSLETTER_SECRET; o volume /app/data não é mais necessário); CI verde nos últimos runs (gh run list --limit 5).` },
  { key: 'billing', prompt: `Adote .claude/agents/billing-specialist.md (ignore o frontmatter). ${RO} Avalie se um advogado consegue hoje pagar e ter o site publicado de forma confiável, e se falha de pagamento/cancelamento é tratada. Liste o que o usuário precisa testar manualmente em produção e no sandbox (skill asaas-sandbox), se o webhook do Asaas está registrado com os eventos PAYMENT_*/SUBSCRIPTION_* e não interrompido, e se o cron de varredura (billing-sweep) está rodando.` },
  { key: 'emails', prompt: `Adote .claude/agents/email-engineer.md (ignore o frontmatter). ${RO} Inventarie os e-mails do ciclo de vida (magic link, boas-vindas, assinatura confirmada, pagamento falhou, cancelamento, site no ar, tickets) — existe? via Resend ou SMTP? remetente/domínio consistente? Aponte lacunas que afetam um cliente pagante.` },
  { key: 'seo-funil', prompt: `Adote .claude/agents/seo-growth.md (ignore o frontmatter). ${RO} Avalie se a aquisição está pronta: LP → cadastro (CTAs, UTM, pixel), blog → LP, perfis públicos indexáveis corretamente (canonical, 404, noindex inativos, sitemap). Pode fazer GET em https://advlink.site, https://blog.advlink.site e https://${demoSlug}.advlink.site.` },
]

phase('Check')
const results = (await parallel(CHECKS.map(c => () =>
  agent(c.prompt, { label: `check:${c.key}`, phase: 'Check', schema: CHECK }).then(r => r && { ...r, area: c.key })
))).filter(Boolean)

const blocking = results.filter(r => r.status === 'bloqueante').map(r => r.area)
log(blocking.length ? `Bloqueantes: ${blocking.join(', ')}` : 'Nenhuma área bloqueante')

phase('Report')
const path = `docs/launch-readiness-${date}.md`
await agent(
  `Escreva em pt-BR o arquivo ${path} (único arquivo que você pode criar; não altere código). Comece com o veredito: PRONTO / PRONTO COM RESSALVAS / NÃO PRONTO PARA DIVULGAR, e por quê em 3 linhas. Depois uma tabela por área com cada checagem (✅/❌, evidência, ação), e por fim a lista ordenada de ações para destravar a divulgação, indicando o agent responsável (.claude/agents).\n\nResultados:\n${JSON.stringify(results, null, 2)}`,
  { label: 'report', phase: 'Report' },
)

return { path, blocking, status: results.map(r => [r.area, r.status]) }
