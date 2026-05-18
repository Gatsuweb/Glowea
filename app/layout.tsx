import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glowéa - Dashboard",
  description: "Dashboard pour techniciennes de cils et ongle",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClerkProvider>
          <header className="flex justify-end items-center p-4 gap-4 h-16">
            <Show when="signed-out">
              <SignInButton forceRedirectUrl="/dashboard">
                <button style={{ background: "transparent", color: "var(--tertiary)", border: "none", fontWeight: "bold", cursor: "pointer", padding: "0.5rem 1rem" }}>
                  Se connecter
                </button>
              </SignInButton>
              <SignUpButton forceRedirectUrl="/dashboard">
                <button style={{ backgroundColor: "var(--tertiary)", color: "white", borderRadius: "9999px", fontWeight: "500", fontSize: "1rem", height: "2.5rem", padding: "0 1.25rem", cursor: "pointer", border: "none" }}>
                  S&apos;inscrire
                </button>
              </SignUpButton>
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
