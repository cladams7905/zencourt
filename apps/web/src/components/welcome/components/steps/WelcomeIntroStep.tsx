import { ZencourtLogo } from "../../../ui/zencourt-logo";

export function WelcomeIntroStep() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 py-12">
      <div className="relative">
        <ZencourtLogo width={48} height={48} className="object-contain" />
      </div>

      <div className="space-y-4 text-center max-w-xl">
        <h1 className="font-header text-5xl md:text-6xl font-bold text-foreground tracking-tight">
          Welcome to Zencourt
        </h1>
        <p className="text-md md:text-lg text-muted-foreground leading-relaxed px-4">
          Let&apos;s personalize your experience. We&apos;ll ask you a few quick
          questions to tailor your dashboard and content recommendations to your
          unique real estate marketing needs.
        </p>
      </div>
    </div>
  );
}
