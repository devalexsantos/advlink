import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "newsletter.json");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Subscriber {
  email: string;
  subscribedAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSubscribers(): Subscriber[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeSubscribers(subscribers: Subscriber[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(subscribers, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "O e-mail é obrigatório." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: "Formato de e-mail inválido." },
        { status: 400 }
      );
    }

    const subscribers = readSubscribers();

    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json(
        { success: false, message: "Este e-mail já está inscrito." },
        { status: 409 }
      );
    }

    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    writeSubscribers(subscribers);

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
