import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../lib/stack/client";
import { Toaster } from "../components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZenCourt - Home",
  description: "AI Marketing Studio for Real Estate Professionals"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StackProvider app={stackClientApp}>
          <StackTheme>{children}</StackTheme>
          <Toaster />
        </StackProvider>
      </body>
    </html>
  );
}
