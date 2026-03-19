import { MDXRemote } from "next-mdx-remote/rsc";
import { ADVLINK_URL } from "@/lib/constants";

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-lg border-l-4 border-primary bg-secondary/50 p-4">
      {children}
    </div>
  );
}

function CTA() {
  return (
    <div className="my-8 rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
      <p className="text-lg font-semibold text-foreground">
        Crie seu site profissional de advocacia agora
      </p>
      <p className="mt-1 text-muted-foreground">
        Sem precisar saber programar. Configure em minutos.
      </p>
      <a
        href={ADVLINK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        Começar gratuitamente
      </a>
    </div>
  );
}

const components = {
  Callout,
  CTA,
};

interface MdxContentProps {
  source: string;
}

export function MdxContent({ source }: MdxContentProps) {
  return (
    <div className="prose prose-lg mx-auto max-w-3xl">
      <MDXRemote source={source} components={components} />
    </div>
  );
}
