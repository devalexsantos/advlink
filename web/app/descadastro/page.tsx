import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Descadastro de e-mails | AdvLink",
  robots: { index: false, follow: false },
}

export default async function DescadastroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      {erro ? (
        <>
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-muted-foreground">
            Não foi possível processar este link de descadastro. Use o link do e-mail mais recente ou escreva para
            advlinkcontato@gmail.com.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Pronto, você não receberá mais e-mails de dicas e relatórios do seu site</h1>
          <p className="text-muted-foreground">E-mails de conta e cobrança continuam sendo enviados normalmente.</p>
        </>
      )}
    </main>
  )
}
