import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { getNewsletterSecret } from "@/lib/newsletter/config";
import { verifyToken } from "@/lib/newsletter/token";
import { unsubscribeAction } from "../actions";
import { TokenActionForm } from "../TokenActionForm";

export const metadata: Metadata = {
  title: "Cancelar inscrição na newsletter",
  robots: { index: false, follow: false },
  // The token is in the URL: never leak it to other sites through the Referer header
  referrer: "no-referrer",
  alternates: { canonical: null },
};

export default async function DescadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  const secret = getNewsletterSecret();
  const check = typeof token === "string" && secret ? verifyToken(token, "unsubscribe", secret) : null;

  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cancelar inscrição</h1>

          {!secret ? (
            <p className="mt-4 text-muted-foreground">
              Não foi possível processar o pedido agora. Tente novamente mais tarde.
            </p>
          ) : check?.ok ? (
            <>
              <p className="mt-4 text-muted-foreground">
                Clique no botão para deixar de receber a newsletter do Blog AdvLink.
              </p>
              <TokenActionForm
                token={token as string}
                action={unsubscribeAction}
                buttonLabel="Cancelar inscrição"
                pendingLabel="Cancelando..."
                messages={{
                  ok: {
                    title: "Inscrição cancelada",
                    body: "Você não receberá mais a newsletter. Se mudar de ideia, é só se inscrever de novo.",
                  },
                  invalid: "Este link de descadastro é inválido.",
                  failure: "Não foi possível cancelar agora. Tente novamente em alguns minutos.",
                }}
              />
            </>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Link de descadastro inválido. Confira se copiou o endereço completo do e-mail.
            </p>
          )}
        </div>
      </Container>
    </main>
  );
}
