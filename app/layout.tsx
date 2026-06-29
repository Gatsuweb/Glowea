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
