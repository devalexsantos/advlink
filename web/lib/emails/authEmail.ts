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
    footerNote: `Ou copie e cole este link no navegador:<br><a href="${url}" style="color:#0a2463;word-break:break-all;font-size:12px;">${url}</a>`,
  })
}

export function createSignInEmailText({ url }: { url: string }) {
  return `Seu acesso à AdvLink

Você solicitou um link de acesso à plataforma AdvLink.
Clique no link abaixo para entrar. Este link expira em 24 horas.

${url}

Se você não solicitou este e-mail, ignore-o.

— AdvLink | Plataforma para advogados
https://app.advlink.site`
}
