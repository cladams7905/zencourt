import type { Metadata } from "next";
import { QueryProvider } from "../components/providers/QueryProvider";
import { StackAuthProvider } from "../components/providers/StackAuthProvider";
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
          <StackAuthProvider>{children}</StackAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
