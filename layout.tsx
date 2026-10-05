import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lagos Hoje | Notícias da Região dos Lagos e do Rio de Janeiro",
    template: "%s | Lagos Hoje",
  },
  description:
    "Notícias da Região dos Lagos e de todo o estado do Rio de Janeiro, organizadas por cidade e editoria. Fontes identificadas, sínteses breves e acesso à reportagem original.",
  applicationName: "Lagos Hoje",
  keywords: [
    "Lagos Hoje",
    "Região dos Lagos",
    "Rio de Janeiro",
    "notícias RJ",
    "Cabo Frio",
    "Arraial do Cabo",
    "Búzios",
  ],
  openGraph: {
    title: "Lagos Hoje | Região dos Lagos e todo o Rio",
    description:
      "De onde a gente vive para todo o Rio. Notícias por cidade e editoria, sempre com crédito à fonte.",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
