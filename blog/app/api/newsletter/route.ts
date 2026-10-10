import { NextResponse } from "next/server";
import { getNewsletterConfig } from "@/lib/newsletter/config";
import { normalizeEmail } from "@/lib/newsletter/email";
import { sendConfirmation } from "@/lib/newsletter/service";

// Double opt-in, step 1. Subscribers live in Resend Contacts; nothing is stored here.
// The response is identical whether or not the address is already subscribed.
const ACCEPTED_MESSAGE = "Quase lá! Enviamos um link de confirmação para o seu e-mail.";

// Per-instance limits (single container)
const RATE_LIMIT = 5; // sign-ups per IP per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 10 * 60 * 1000; // at most one confirmation e-mail per address every 10 min
const hits = new Map<string, { count: number; resetAt: number }>();
const lastSentTo = new Map<string, number>();

function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  // Last hop is the one appended by our proxy; the first is client-controlled
  const hops = (request.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops[hops.length - 1] ?? "unknown";
}

function isRateLimited(ip: string, now = Date.now()): boolean {
  if (hits.size > 10_000) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

// Stops the form from being used to flood one inbox from many IPs
function isInCooldown(email: string, now = Date.now()): boolean {
  if (lastSentTo.size > 10_000) {
    for (const [key, at] of lastSentTo) if (now - at >= EMAIL_COOLDOWN_MS) lastSentTo.delete(key);
  }
  const last = lastSentTo.get(email);
  if (last !== undefined && now - last < EMAIL_COOLDOWN_MS) return true;
  lastSentTo.set(email, now);
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Requisição inválida." }, { status: 400 });
    }

    // Honeypot: real users never see/fill this field; bots do. Pretend it worked.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, message: ACCEPTED_MESSAGE });
    }

    if (isRateLimited(clientIp(request))) {
      return NextResponse.json(
        { success: false, message: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    if (typeof body.email !== "string" || body.email.trim() === "") {
      return NextResponse.json({ success: false, message: "O e-mail é obrigatório." }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ success: false, message: "Formato de e-mail inválido." }, { status: 400 });
    }

    const config = getNewsletterConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, message: "A newsletter está indisponível no momento. Tente mais tarde." },
        { status: 503 }
      );
    }

    if (!isInCooldown(email)) {
      try {
        await sendConfirmation(config, email);
      } catch (err) {
        lastSentTo.delete(email);
        throw err;
      }
    }

    return NextResponse.json({ success: true, message: ACCEPTED_MESSAGE });
  } catch (err) {
    console.error("[newsletter] subscribe failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ success: false, message: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
