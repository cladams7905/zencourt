import type { Metadata } from "next";
import { StackProvider } from "@stackframe/stack";
import { stackClientApp } from "../server/lib/stack/client";
import { QueryProvider } from "../components/providers/QueryProvider";
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
        <QueryProvider>
          <StackProvider app={stackClientApp}>
            {children}
          </StackProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
