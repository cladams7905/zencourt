import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../lib/stack/client";
import { Toaster } from "../components/ui/sonner";
import {
  Playfair_Display,
  Mulish,
  Italiana,
  Rouge_Script,
  TikTok_Sans,
  Gwendolyn,
  DM_Serif_Text,
  Onest
} from "next/font/google";
import "./globals.css";

const body = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap"
});

const header = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-header",
  display: "swap"
});

// |---------- BEGIN Text Overlay Fonts -------------|

const italiana = Italiana({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-italiana",
  display: "swap"
});

const rougeScript = Rouge_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-rouge",
  display: "swap"
});

const gwendolyn = Gwendolyn({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-gwendolyn",
  display: "swap"
});

const tikTokSans = TikTok_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-tiktok",
  display: "swap",
  adjustFontFallback: false
});

const dmSerif = DM_Serif_Text({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap"
});

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
  display: "swap"
});

// |---------- END Text Overlay Fonts -------------|

export const metadata: Metadata = {
  title: "Zencourt - Home",
  description: "AI Marketing Studio for Real Estate Professionals"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${header.variable} ${italiana.variable} ${rougeScript.variable} ${gwendolyn.variable} ${tikTokSans.variable} ${dmSerif.variable} ${onest.variable}`}
    >
      <body className="antialiased">
        <StackProvider app={stackClientApp}>
          <StackTheme>{children}</StackTheme>
          <Toaster />
        </StackProvider>
      </body>
    </html>
  );
}
