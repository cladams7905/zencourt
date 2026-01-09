import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../lib/stack/client";
import { Toaster } from "../components/ui/sonner";
import { Playfair_Display, Mulish } from "next/font/google";
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
    <html lang="en" className={`${body.variable} ${header.variable}`}>
      <body className="antialiased">
        <StackProvider app={stackClientApp}>
          <StackTheme>{children}</StackTheme>
          <Toaster />
        </StackProvider>
      </body>
    </html>
  );
}
