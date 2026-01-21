import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

interface AuthViewProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthView({ children }: AuthViewProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-br from-accent via-white to-accent/20 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-accent/40 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/zencourt-logo.png"
              alt="Zencourt"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-foreground font-header text-3xl font-semibold tracking-tight">
              zencourt
            </span>
          </div>

          {/* Center Message */}
          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-header font-semibold text-foreground leading-[1.1] mb-6">
              Turn listings into{" "}
              <span className="relative inline-block">
                <span className="absolute inset-x-0 bottom-2 h-3 bg-secondary/40 -z-10 transform -rotate-1 rounded-sm" />
                viral content
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join thousands of realtors creating stunning social media content
              in seconds, not hours.
            </p>
          </div>

          {/* Bottom Stats */}
          <div className="flex gap-12">
            <div>
              <div className="text-3xl font-header font-bold text-foreground mb-1">
                15h+
              </div>
              <div className="text-sm text-muted-foreground">Saved weekly</div>
            </div>
            <div>
              <div className="text-3xl font-header font-bold text-foreground mb-1">
                300%
              </div>
              <div className="text-sm text-muted-foreground">
                Engagement boost
              </div>
            </div>
            <div>
              <div className="text-3xl font-header font-bold text-foreground mb-1">
                50k+
              </div>
              <div className="text-sm text-muted-foreground">
                Assets created
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <Image
              src="/zencourt-logo.png"
              alt="Zencourt"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
              zencourt
            </span>
          </div>

          {/* Auth Form Container */}
          <div className="space-y-6 flex align-center justify-center">
            {children}
          </div>

          {/* Footer Note */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="text-foreground transition-colors underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-foreground transition-colors underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
