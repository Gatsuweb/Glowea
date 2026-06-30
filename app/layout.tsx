import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getSiteUrl } from "../lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Glowea - Plateforme de reservation beaute",
    template: "%s | Glowea",
  },
  description:
    "Glowea aide les professionnelles de la beaute a gerer leurs clientes, rendez-vous, prestations et reservations en ligne.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/logo-mini.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
    shortcut: ["/logo-mini.png"],
    apple: [
      {
        url: "/logo-mini.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "Glowea - Plateforme de reservation beaute",
    description:
      "Glowea aide les professionnelles de la beaute a gerer leurs clientes, rendez-vous, prestations et reservations en ligne.",
    url: "/",
    siteName: "Glowea",
    images: [
      {
        url: "/logo-mini.png",
        width: 500,
        height: 500,
        alt: "Glowea",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Glowea - Plateforme de reservation beaute",
    description:
      "Glowea aide les professionnelles de la beaute a gerer leurs clientes, rendez-vous, prestations et reservations en ligne.",
    images: ["/logo-mini.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
