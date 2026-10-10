import { getNewsletterConfig, type NewsletterConfig } from "./config";
import { subscribeContact, unsubscribeContact } from "./contacts";
import { confirmationEmail, welcomeEmail } from "./emails";
import { CONFIRM_TTL_SECONDS, signToken, verifyToken, type VerifyResult } from "./token";

export type FlowResult = "ok" | "invalid" | "expired" | "unavailable" | "error";

function reasonToResult(result: Extract<VerifyResult, { ok: false }>): FlowResult {
  return result.reason === "expired" ? "expired" : "invalid";
}

function unsubscribeLinks(config: NewsletterConfig, email: string) {
  const token = signToken({ email, purpose: "unsubscribe" }, config.secret);
  const query = `token=${encodeURIComponent(token)}`;
  return {
    page: `${config.baseUrl}/newsletter/descadastro?${query}`,
    oneClick: `${config.baseUrl}/api/newsletter/unsubscribe?${query}`,
  };
}

/** Step 1 of the double opt-in: e-mail a signed confirmation link (valid for 48h). */
export async function sendConfirmation(config: NewsletterConfig, email: string): Promise<void> {
  const token = signToken({ email, purpose: "confirm", ttlSeconds: CONFIRM_TTL_SECONDS }, config.secret);
  const { subject, html, text } = confirmationEmail(
    `${config.baseUrl}/newsletter/confirmar?token=${encodeURIComponent(token)}`
  );
  const { error } = await config.resend.emails.send({ from: config.from, to: email, subject, html, text });
  if (error) throw new Error(`Resend emails.send failed: ${error.name}`);
}

/** Step 2: the link was opened and confirmed. Creates/re-activates the contact and sends the welcome e-mail. */
export async function confirmSubscription(token: unknown): Promise<FlowResult> {
  const config = getNewsletterConfig();
  if (!config) return "unavailable";
  const verified = verifyToken(token, "confirm", config.secret);
  if (!verified.ok) return reasonToResult(verified);

  try {
    const outcome = await subscribeContact(config.resend, verified.email, config.segmentId);
    if (outcome !== "already_active") {
      const links = unsubscribeLinks(config, verified.email);
      const { subject, html, text } = welcomeEmail(links.page, config.baseUrl);
      const { error } = await config.resend.emails.send({
        from: config.from,
        to: verified.email,
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${links.oneClick}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      // The subscription itself succeeded; a failed welcome e-mail is only logged.
      if (error) console.error(`[newsletter] welcome e-mail failed: ${error.name}`);
    }
    return "ok";
  } catch (err) {
    console.error("[newsletter] confirm failed:", err instanceof Error ? err.message : "unknown error");
    return "error";
  }
}

export async function unsubscribe(token: unknown): Promise<FlowResult> {
  const config = getNewsletterConfig();
  if (!config) return "unavailable";
  const verified = verifyToken(token, "unsubscribe", config.secret);
  if (!verified.ok) return reasonToResult(verified);

  try {
    // "not_found" is also success: the person is not receiving anything either way.
    await unsubscribeContact(config.resend, verified.email);
    return "ok";
  } catch (err) {
    console.error("[newsletter] unsubscribe failed:", err instanceof Error ? err.message : "unknown error");
    return "error";
  }
}
