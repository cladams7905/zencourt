import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-background via-background to-accent text-foreground">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <Loader2 className="absolute h-20 w-20 animate-spin text-primary" />
          <Image
            src="/zencourt-logo.svg"
            alt="Zencourt"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
