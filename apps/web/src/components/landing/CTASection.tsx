import Link from "next/link";
import { Button } from "../ui/button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden bg-primary" id="pricing">
      {/* Background Decoration with grain */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none grain-overlay" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none grain-light" />

      <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
        <h2 className="text-display-md font-header font-bold text-primary-foreground mb-6">
          Ready to Automate Your Success?
        </h2>
        <p className="text-body-lg text-primary-foreground/70 mb-12 max-w-2xl mx-auto">
          Join the new standard of real estate marketing. Create stunning,
          branded content in seconds, not hours.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/handler/sign-in" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto px-10 py-6 text-lg font-bold shadow-lg"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
        <p className="mt-8 text-sm text-primary-foreground/50">
          No credit card required for 14-day trial.
        </p>
      </div>
    </section>
  );
}
