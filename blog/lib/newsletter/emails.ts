// Plain, accessible HTML e-mails (single column, real text, no images) + text fallbacks.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<div role="article" aria-label="${escapeHtml(title)}" lang="pt-BR" style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#18181b;background:#ffffff;">
<p style="margin:0 0 24px;font-size:14px;font-weight:bold;color:#52525b;">Blog AdvLink</p>
${body}
</div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  const safe = escapeHtml(href);
  return `<p style="margin:24px 0;"><a href="${safe}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(label)}</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${safe}" style="color:#18181b;word-break:break-all;">${safe}</a></p>`;
}

export function confirmationEmail(confirmUrl: string) {
  const subject = "Confirme sua inscrição na newsletter do Blog AdvLink";
  const html = layout(
    subject,
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Falta só um passo</h1>
<p style="margin:0 0 16px;">Recebemos um pedido para inscrever este e-mail na newsletter do Blog AdvLink, com novos artigos sobre marketing jurídico e presença digital para a advocacia.</p>
<p style="margin:0 0 16px;">Para confirmar, clique no botão abaixo. O link vale por 48 horas.</p>
${button(confirmUrl, "Confirmar inscrição")}
<p style="margin:0;font-size:14px;color:#52525b;">Se não foi você que pediu, ignore esta mensagem: sem a confirmação, nenhum e-mail será enviado.</p>`
  );
  const text = `Falta só um passo

Recebemos um pedido para inscrever este e-mail na newsletter do Blog AdvLink.
Para confirmar, abra o link abaixo (vale por 48 horas):

${confirmUrl}

Se não foi você que pediu, ignore esta mensagem: sem a confirmação, nenhum e-mail será enviado.`;
  return { subject, html, text };
}

export function welcomeEmail(unsubscribeUrl: string, blogUrl: string) {
  const subject = "Inscrição confirmada no Blog AdvLink";
  const html = layout(
    subject,
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Inscrição confirmada</h1>
<p style="margin:0 0 16px;">Obrigado por confirmar. A partir de agora você recebe os novos artigos do Blog AdvLink sobre marketing jurídico, presença digital e boas práticas de comunicação para advogados.</p>
<p style="margin:0 0 16px;">Enquanto isso, os artigos já publicados estão em <a href="${escapeHtml(blogUrl)}" style="color:#18181b;">${escapeHtml(blogUrl.replace(/^https?:\/\//, ""))}</a>.</p>
<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
<p style="margin:0;font-size:14px;color:#52525b;">Não quer mais receber? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#18181b;">Cancelar inscrição</a>. Você pode fazer isso a qualquer momento.</p>`
  );
  const text = `Inscrição confirmada

Obrigado por confirmar. A partir de agora você recebe os novos artigos do Blog AdvLink.
Artigos já publicados: ${blogUrl}

Para cancelar a inscrição a qualquer momento: ${unsubscribeUrl}`;
  return { subject, html, text };
}
