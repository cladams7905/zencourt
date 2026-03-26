import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { getStackClientApp } from "@web/src/lib/core/auth/stack/client";
import { Toaster } from "../components/ui/sonner";
import {
  Playfair_Display,
  Plus_Jakarta_Sans,
  Noto_Serif_Display,
  Rouge_Script,
  Open_Sans,
  Gwendolyn,
  DM_Serif_Text,
  Onest
} from "next/font/google";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
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

const notoSerifDisplay = Noto_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-noto-serif-display",
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

const tikTokSans = Open_Sans({
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
  const hasStackProjectId = Boolean(process.env.NEXT_PUBLIC_STACK_PROJECT_ID);
  return (
    <html
      lang="en"
      className={`${body.variable} ${header.variable} ${notoSerifDisplay.variable} ${rougeScript.variable} ${gwendolyn.variable} ${tikTokSans.variable} ${dmSerif.variable} ${onest.variable}`}
    >
      <body className="antialiased">
        {hasStackProjectId ? (
          <StackProvider app={getStackClientApp()}>
            <StackTheme>{children}</StackTheme>
            <Toaster />
          </StackProvider>
        ) : (
          <>
            {children}
            <Toaster />
          </>
        )}
      </body>
    </html>
  );
}
