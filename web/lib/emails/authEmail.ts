export function createSignInEmailHtml({ url }: { url: string }) {
  return `
  <body style="background:#ffffff;padding:16px;color:#000000;font-family:Arial, Helvetica, sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;background:#ffffff">
      <tr>
        <td style="padding:16px 16px 0 16px;text-align:left">
          <div style="font-weight:700;font-size:18px;color:#111827">AdvLink</div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 16px 0 16px;text-align:left">
          <h1 style="margin:0;font-size:18px;line-height:24px;font-weight:700;color:#111827">Seu acesso com Magic Link</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 16px 0 16px;text-align:left;color:#111827;font-size:14px">Clique no botão abaixo para entrar. Este link expira em 24h.</td>
      </tr>
      <tr>
        <td style="padding:16px;text-align:left">
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 16px;border-radius:4px;font-weight:600;text-decoration:none;color:#ffffff;background:#111827;border:1px solid #111827">Entrar</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 16px 16px;color:#111827;font-size:12px;text-align:left">Se você não solicitou este e-mail, ignore-o.</td>
      </tr>
    </table>
  </body>`
}

export function createSignInEmailText({ url }: { url: string }) {
  return `Use o link para entrar: ${url}`
}


