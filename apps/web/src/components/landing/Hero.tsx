import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1 className="text-display-lg font-header font-semibold text-foreground mb-8">
          Effortless Social Media Marketing for{" "}
          <span className="relative inline-block px-2">
            <span className="absolute inset-x-0 bottom-2 h-4 bg-secondary/40 -z-10 transform -rotate-1 rounded-sm grain-overlay" />
            Real Estate
          </span>
        </h1>
        <p className="text-body-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
          Turn every listing into a powerful social media listing in minutes.
          Generate videos, reels, and posts automatically from your property
          photos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link href="/handler/sign-in" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto px-10 py-6 text-lg font-medium shadow-xl hover:shadow-2xl transition-all group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Background decoration with grain */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] -z-10 pointer-events-none grain-overlay" />
      <div className="absolute top-20 left-0 translate-y-12 -translate-x-1/4 w-[500px] h-[500px] bg-secondary/40 rounded-full blur-[100px] -z-10 pointer-events-none grain-light" />
    </section>
  );
}
