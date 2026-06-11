import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

// Sora — body text (available in next/font)
const sans = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

// JetBrains Mono — data / KAL amounts / addresses
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

// Rubik Storm (h1–h3) and Bitcount Grid Single (h4/h5 + kickers) are 2025-new fonts —
// loaded via <link> because they may not be in this Next.js version's next/font allowlist.

export const metadata: Metadata = {
  title: "KaL — Knowledge as Liquidity",
  description: "Prove what you know. Earn KAL tokens and Soulbound credentials for verified expertise.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Google Fonts — Rubik Storm + Bitcount Grid Single */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik+Storm&family=Bitcount+Grid+Single&display=swap"
        />
      </head>
      <body className="grain">
        <Providers>
          <NavBar />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
