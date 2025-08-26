import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NextTopLoader from 'nextjs-toploader';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Script from "next/script";
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

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? '1003801661770634'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Inicialização do Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){
              if(f.fbq)return; n=f.fbq=function(){ n.callMethod ?
                n.callMethod.apply(n,arguments) : n.queue.push(arguments) }
              ;
              if(!f._fbq) f._fbq=n;
              n.push=n; n.loaded=!0; n.version='2.0';
              n.queue=[];
              t=b.createElement(e); t.async=!0;
              t.src=v;
              s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)
            }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {/* Noscript do Pixel */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>

        {/* Rastreia PageView em navegações do App Router */}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <NextTopLoader />
        <Analytics />
        <SpeedInsights />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
