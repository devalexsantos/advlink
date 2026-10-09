export const meta = {
  name: 'feature',
  description: 'Implementa uma mudança no AdvLink: plano → implementação → testes → verify → revisão',
  whenToUse: 'Feature ou correção de porte médio que toca backend e/ou frontend. args: { task: "descrição", branch?: "feat/x" }',
  phases: [
    { title: 'Plan', detail: 'plano com arquivos, riscos e testes' },
    { title: 'Implement', detail: 'agent do domínio aplica o plano' },
    { title: 'Test', detail: 'test-engineer cobre a mudança' },
    { title: 'Verify', detail: 'skill verify, até 2 rodadas de correção' },
    { title: 'Review', detail: 'revisão independente do diff' },
  ],
}

const task = args && (args.task || args)
if (!task || typeof task !== 'string') throw new Error('Passe args: { task: "descrição da mudança" }')
const branch = args && args.branch

const PLAN = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    domain: { type: 'string', enum: ['backend', 'frontend', 'fullstack', 'billing', 'email', 'seo'] },
    steps: { type: 'array', items: { type: 'string' } },
    files: { type: 'array', items: { type: 'string' } },
    schemaChange: { type: 'boolean' },
    risks: { type: 'array', items: { type: 'string' } },
    tests: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'domain', 'steps', 'files', 'schemaChange', 'risks', 'tests'],
}
const VERIFY = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    lint: { type: 'string' }, typecheck: { type: 'string' }, tests: { type: 'string' }, build: { type: 'string' },
    failures: { type: 'string', description: 'saída relevante das falhas introduzidas pela mudança' },
  },
  required: ['ok', 'lint', 'typecheck', 'tests', 'build', 'failures'],
}

phase('Plan')
const plan = await agent(
  `Planeje (sem editar arquivos) a seguinte mudança no AdvLink:\n\n${task}\n\nLeia o código relevante, reutilize utilitários existentes (web/lib/*), respeite multi-site (getActiveSiteId/profileId) e o padrão da skill .claude/skills/api-route/SKILL.md. Se houver mudança de schema, siga .claude/skills/db-migration/SKILL.md.`,
  { label: 'plan', phase: 'Plan', schema: PLAN },
)
log(`Plano: ${plan.summary} (${plan.domain}, ${plan.files.length} arquivos)`)

const AGENT_FILE = {
  backend: 'backend-engineer', frontend: 'frontend-engineer', fullstack: 'backend-engineer',
  billing: 'billing-specialist', email: 'email-engineer', seo: 'seo-growth',
}[plan.domain]

phase('Implement')
await agent(
  `Adote as instruções de .claude/agents/${AGENT_FILE}.md (ignore o frontmatter).${branch ? ` Antes de editar, crie/troque para a branch ${branch} (git switch -c ${branch} || git switch ${branch}).` : ' Não troque de branch.'}\nImplemente este plano no AdvLink. Não faça commit.\n\nTarefa: ${task}\n\nPlano:\n${JSON.stringify(plan, null, 2)}${plan.domain === 'fullstack' ? '\n\nInclui frontend: siga também as regras de .claude/agents/frontend-engineer.md para as partes de UI.' : ''}`,
  { label: `implement:${AGENT_FILE}`, phase: 'Implement' },
)

phase('Test')
await agent(
  `Adote as instruções de .claude/agents/test-engineer.md (ignore o frontmatter). Escreva/atualize testes Vitest para a mudança não commitada (veja \`git diff\` e \`git status\`). Cubra: ${plan.tests.join('; ')}. Rode os testes dos arquivos tocados até passarem. Não faça commit.`,
  { label: 'tests', phase: 'Test' },
)

phase('Verify')
let verify = null
for (let round = 0; round < 3; round++) {
  verify = await agent(
    `Execute a skill de verificação descrita em .claude/skills/verify/SKILL.md em web/ (lint, typecheck, test, build). IMPORTANTE: lint e typecheck já tinham erros antes desta mudança (dívida conhecida). Considere falha apenas erros em arquivos presentes em \`git diff --name-only\` / \`git status --porcelain\`. Build falhando só por env ausente não conta como falha. Não edite arquivos.`,
    { label: `verify:${round + 1}`, phase: 'Verify', schema: VERIFY },
  )
  if (verify.ok || round === 2) break
  log(`verify falhou (rodada ${round + 1}), corrigindo`)
  await agent(
    `Corrija as falhas abaixo, introduzidas pela mudança não commitada no AdvLink. Não enfraqueça asserções de teste sem justificar. Não faça commit.\n\n${verify.failures}`,
    { label: `fix:${round + 1}`, phase: 'Verify' },
  )
}

phase('Review')
const review = await agent(
  `Revise criticamente o diff não commitado do AdvLink (\`git diff\` + arquivos novos em \`git status\`) para a tarefa: "${task}". Procure bugs de correção, IDOR multi-site (escopo por profileId), XSS, validação ausente, regressões e testes fracos. Não edite arquivos. Liste apenas problemas reais com arquivo:linha, ou diga que está aprovado.`,
  { label: 'review', phase: 'Review' },
)

return { plan, verify, review }
