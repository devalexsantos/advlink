import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NextTopLoader from 'nextjs-toploader';
import MetaPixel from "@/components/MetaPixel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "AdvLink",
  description: "Criador Inteligente de Sites para Advogados e Escritórios de Advocacia",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce set by proxy.ts on private areas (absent elsewhere). Reading headers() also keeps
  // these pages dynamically rendered, which nonces require: prerendered HTML has no nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {/* Meta Pixel (só no funil do app — nunca nos sites públicos dos advogados) */}
        <Suspense fallback={null}>
          <MetaPixel nonce={nonce} />
        </Suspense>
        <NextTopLoader />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
