import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="relative flex flex-col gap-6 items-center justify-center">
          <Image
            src="/zencourt-logo.svg"
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
