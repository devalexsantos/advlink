import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Stored on the persistent volume mounted at /app/data (see Dockerfile / Easypanel).
// Not versioned in git: it contains subscribers' e-mails.
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "newsletter.json");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Per-instance limit (single container): 5 sign-ups per IP per hour
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();

interface Subscriber {
  email: string;
  subscribedAt: string;
}

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

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// Write to a temp file and rename: a crash mid-write never leaves a truncated list behind
async function writeSubscribers(subscribers: Subscriber[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(subscribers, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

// Serialize read-modify-write so concurrent sign-ups don't overwrite each other
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot: real users never see/fill this field; bots do. Pretend it worked.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, message: "Inscrição realizada com sucesso!" });
    }

    if (isRateLimited(clientIp(request))) {
      return NextResponse.json(
        { success: false, message: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "O e-mail é obrigatório." },
        { status: 400 }
      );
    }

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: "Formato de e-mail inválido." },
        { status: 400 }
      );
    }

    const added = await withLock(async () => {
      const subscribers = await readSubscribers();
      if (subscribers.some((s) => s.email === email)) return false;
      subscribers.push({ email, subscribedAt: new Date().toISOString() });
      await writeSubscribers(subscribers);
      return true;
    });

    if (!added) {
      return NextResponse.json(
        { success: false, message: "Este e-mail já está inscrito." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inscrição realizada com sucesso!",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
