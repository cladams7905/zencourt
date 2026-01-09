import { Play, ArrowRight, Film, Download } from "lucide-react";
import Link from "next/link";

export function FeatureSpotlight2() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          {/* Right: Text Content */}
          <div className="w-full lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                New Feature
              </span>
            </div>
            <h2 className="text-display-md font-header font-semibold text-foreground">
              Stunning Video Clips,
              <br />
              Effortlessly Generated
            </h2>
            <p className="text-body-lg text-muted-foreground">
              Don&apos;t let static images sit idle. Zencourt&apos;s advanced AI
              weaves your property photos into dynamic, high-engagement video
              clips perfect for Instagram Reels and TikTok. Capture attention
              instantly with smooth transitions and synchronized audio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl border border-border w-full sm:w-auto">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  Cv
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Export to Canva
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Edit seamlessly
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl border border-border w-full sm:w-auto">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Export to CapCut
                  </div>
                  <div className="text-xs text-muted-foreground">
                    One-click share
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/handler/sign-in"
              className="inline-flex items-center text-foreground font-medium hover:text-accent transition-colors group mt-4"
            >
              Try Video Generation
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Left: Video Generator Mockup */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative bg-secondary/50 rounded-3xl p-6 border border-border shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Video Generator
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span className="w-2 h-2 rounded-full bg-border" />
                </div>
              </div>

              {/* Content */}
              <div className="flex gap-4 items-center">
                {/* Input Images */}
                <div className="flex flex-col gap-3 w-1/3">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`aspect-4/3 rounded-lg overflow-hidden shadow-sm border border-border relative ${
                        num > 1 ? "grayscale opacity-70" : ""
                      }`}
                    >
                      <div className="w-full h-full bg-linear-to-br from-accent/30 to-secondary" />
                      <div className="absolute top-1 left-1 bg-background/90 px-1.5 py-0.5 rounded text-[8px] font-bold">
                        0{num}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center text-accent">
                  <ArrowRight className="h-8 w-8 animate-pulse" />
                </div>

                {/* Output Video */}
                <div className="flex-1 aspect-9/16 bg-primary rounded-xl overflow-hidden relative shadow-lg group">
                  <div className="w-full h-full bg-linear-to-br from-accent/20 to-secondary opacity-90 group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/40 cursor-pointer hover:bg-white/30 transition-colors">
                      <Play className="h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <div className="h-1 bg-white/30 rounded-full flex-1 mr-2 overflow-hidden">
                      <div className="h-full bg-white w-1/3" />
                    </div>
                    <span className="text-[10px] text-white">0:15</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button className="px-4 py-2 text-xs font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-secondary">
                  Preview
                </button>
                <button className="px-4 py-2 text-xs font-medium text-primary-foreground bg-primary rounded-lg shadow-lg hover:bg-primary/90 flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  Export Video
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
