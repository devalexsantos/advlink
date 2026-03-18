export function emailTemplate(options: {
  title: string
  body: string
  cta?: { label: string; url: string }
  preheader?: string
  footerNote?: string
}): string {
  const { title, body, cta, preheader, footerNote } = options

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f4f5f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}${"&zwnj;&nbsp;".repeat(90)}</div>`
    : ""

  const ctaHtml = cta
    ? `<tr>
        <td style="padding:24px 0 0 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${cta.url}" style="height:42px;v-text-anchor:middle;width:200px;" arcsize="14%" strokecolor="#0a2463" fillcolor="#0a2463">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;">${cta.label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius:6px;background:#0a2463;">
                <a href="${cta.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                  ${cta.label}
                </a>
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </td>
      </tr>`
    : ""

  const footerNoteHtml = footerNote
    ? `<tr>
        <td style="padding:16px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">
          ${footerNote}
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding:24px 0;background-color:#ffffff;border-radius:8px 8px 0 0;">
              <img src="https://app.advlink.site/images/advlink-logo-primary.png" alt="AdvLink" width="50" height="50" style="display:block;width:50px;height:50px;" />
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 32px 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <h1 style="margin:0;font-size:22px;line-height:28px;font-weight:700;color:#1f2937;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;line-height:24px;color:#1f2937;">
                    ${body}
                  </td>
                </tr>
                ${ctaHtml}
                ${footerNoteHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff;padding:20px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                    <a href="https://app.advlink.site" target="_blank" rel="noopener noreferrer" style="color:#0a2463;text-decoration:underline;">Acessar plataforma</a>
                    <br />
                    &copy; 2026 AdvLink &mdash; Plataforma para advogados
                    <br />
                    <span style="font-size:11px;color:#9ca3af;">Este e-mail foi enviado por AdvLink. Caso n&atilde;o tenha solicitado, ignore esta mensagem.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
