import { Loader2 } from "lucide-react";
import { AuthView } from "@web/src/components/auth/AuthView";
import { ZencourtLogo } from "@web/src/components/ui/zencourt-logo";

export default function AuthLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="blur-md">
          <AuthView>
            <div className="w-full h-64" />
          </AuthView>
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="relative flex flex-col gap-6 items-center justify-center">
          <ZencourtLogo
            alt="Zencourt"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
          <Loader2 size={32} className="animate-spin" />
        </div>
      </div>
    </div>
  );
}
