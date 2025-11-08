import type { ReactNode } from "react";

interface AuthSurfaceProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthSurface({
  title = "zencourt",
  subtitle = "AI-powered property video creation",
  children
}: AuthSurfaceProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e8ddd3] via-white to-[#d4c4b0] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="bg-white rounded-xl border border-border p-6 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
