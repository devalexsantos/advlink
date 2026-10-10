import { unsubscribe } from "@/lib/newsletter/service";

// RFC 8058 one-click unsubscribe, targeted by the List-Unsubscribe header of our e-mails.
// Mail clients POST here (body "List-Unsubscribe=One-Click") with the signed token in the query.
// GET is intentionally not handled: link scanners prefetch URLs, and a GET must never unsubscribe.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await unsubscribe(token);

  if (result === "ok") return new Response("Inscrição cancelada.", { status: 200 });
  if (result === "invalid" || result === "expired") return new Response("Link inválido.", { status: 400 });
  return new Response("Tente novamente mais tarde.", { status: 503 });
}
