import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { getNewsletterSecret } from "@/lib/newsletter/config";
import { verifyToken } from "@/lib/newsletter/token";
import { confirmAction } from "../actions";
import { TokenActionForm } from "../TokenActionForm";

export const metadata: Metadata = {
  title: "Confirmar inscrição na newsletter",
  robots: { index: false, follow: false },
  // The token is in the URL: never leak it to other sites through the Referer header
  referrer: "no-referrer",
  alternates: { canonical: null },
};

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  const secret = getNewsletterSecret();
  const check = typeof token === "string" && secret ? verifyToken(token, "confirm", secret) : null;

  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Confirmar inscrição</h1>

          {!secret ? (
            <p className="mt-4 text-muted-foreground">
              A newsletter está indisponível no momento. Tente novamente mais tarde.
            </p>
          ) : check?.ok ? (
            <>
              <p className="mt-4 text-muted-foreground">
                Clique no botão para confirmar o recebimento dos novos artigos do Blog AdvLink por e-mail.
                Você pode cancelar quando quiser.
              </p>
              <TokenActionForm
                token={token as string}
                action={confirmAction}
                buttonLabel="Confirmar inscrição"
                pendingLabel="Confirmando..."
                messages={{
                  ok: {
                    title: "Inscrição confirmada!",
                    body: "Enviamos um e-mail de boas-vindas. Os próximos artigos chegam direto na sua caixa de entrada.",
                  },
                  invalid: "Este link de confirmação é inválido ou expirou. Inscreva-se novamente no formulário abaixo.",
                  failure: "Não foi possível confirmar agora. Tente novamente em alguns minutos.",
                }}
              />
            </>
          ) : check && !check.ok && check.reason === "expired" ? (
            <p className="mt-4 text-muted-foreground">
              Este link expirou (ele vale por 48 horas). Inscreva-se novamente no formulário abaixo para
              receber um novo link.
            </p>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Link de confirmação inválido. Confira se copiou o endereço completo do e-mail ou inscreva-se
              novamente no formulário abaixo.
            </p>
          )}
        </div>
      </Container>
    </main>
  );
}
