import { emailTemplate } from "./baseTemplate"

export function createSignInEmailHtml({ url }: { url: string }) {
  return emailTemplate({
    title: "Seu acesso à AdvLink",
    preheader: "Clique no botão abaixo para acessar sua conta na AdvLink.",
    body: `
      <p style="margin:0 0 8px 0;">Você solicitou um link de acesso à plataforma AdvLink.</p>
      <p style="margin:0 0 8px 0;">Clique no botão abaixo para entrar. Este link expira em 24 horas.</p>
      <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;">Se você não solicitou este e-mail, ignore-o.</p>
    `,
    cta: { label: "Entrar na plataforma", url },
  })
}

export function createSignInEmailText({ url }: { url: string }) {
  return `Use o link para entrar: ${url}`
}
