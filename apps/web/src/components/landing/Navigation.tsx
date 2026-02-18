"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { ZencourtLogo } from "../ui/zencourt-logo";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <ZencourtLogo className="object-contain" />
            <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
              zencourt
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link href="/handler/sign-in" className="hidden md:block">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/handler/sign-up">
              <Button
                size="sm"
                className="px-5 py-2.5 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
