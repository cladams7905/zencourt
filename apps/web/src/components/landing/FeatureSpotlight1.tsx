import {
  Brain,
  Palette,
  MapPin,
  Heart,
  MessageCircle,
  Send,
  Music
} from "lucide-react";

export function FeatureSpotlight1() {
  return (
    <section className="py-24 bg-accent/10 border-t border-border relative grain-overlay">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Left: Text Content */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-display-md font-header font-semibold text-foreground mb-6">
              Beyond Templates: Content that Speaks Your Brand
            </h2>
            <p className="text-body-lg text-muted-foreground mb-10">
              Generic posts don&apos;t sell homes. Our content generation engine
              dynamically matches your unique writing style, visual branding,
              and market niche to create posts that feel authentically yours.
            </p>
            <div className="space-y-8">
              <div className="flex gap-5 group">
                <div className="shrink-0 w-12 h-12 bg-background rounded-xl border border-border flex items-center justify-center shadow-sm group-hover:border-accent transition-colors">
                  <Brain className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground font-header mb-1">
                    Adaptive Voice AI
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Analyzes your past captions to mimic your tone
                    perfectly—whether professional, witty, or luxury-focused.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 group">
                <div className="shrink-0 w-12 h-12 bg-background rounded-xl border border-border flex items-center justify-center shadow-sm group-hover:border-accent transition-colors">
                  <Palette className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground font-header mb-1">
                    Visual Brand Consistency
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your fonts, colors, and logo overlay are automatically
                    applied to every generated video and graphic.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 group">
                <div className="shrink-0 w-12 h-12 bg-background rounded-xl border border-border flex items-center justify-center shadow-sm group-hover:border-accent transition-colors">
                  <MapPin className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground font-header mb-1">
                    Hyper-Local Context
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Real-time neighborhood data adds value-driven insights,
                    positioning you as the local expert.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative mx-auto w-[300px] h-[600px] bg-primary rounded-[2.5rem] p-3 shadow-2xl ring-1 ring-primary/5">
              <div className="h-full w-full bg-linear-to-br from-secondary to-accent/20 rounded-4xl overflow-hidden relative">
                {/* AI Generated Badge */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                    AI Generated
                  </span>
                </div>

                {/* Right Side Actions */}
                <div className="absolute right-3 bottom-24 flex flex-col gap-4 items-center z-10">
                  <div className="flex flex-col items-center gap-1">
                    <Heart className="h-8 w-8 text-white drop-shadow-lg" />
                    <span className="text-white text-xs font-medium drop-shadow-md">
                      1.2k
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
                    <span className="text-white text-xs font-medium drop-shadow-md">
                      48
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Send className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                </div>

                {/* Bottom Caption */}
                <div className="absolute bottom-0 w-full p-4 bg-linear-to-t from-black/80 to-transparent pt-12 z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm" />
                    <span className="text-white font-semibold text-sm drop-shadow-sm">
                      Elena_Realtor
                    </span>
                    <button className="text-xs border border-white/40 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                      Follow
                    </button>
                  </div>
                  <p className="text-white text-sm leading-snug drop-shadow-sm mb-2">
                    Finding your dream home is easier than you think ✨ Check
                    out this modern kitchen! #DreamHome
                  </p>
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <Music className="h-4 w-4" />
                    <div className="overflow-hidden w-32">
                      <p className="whitespace-nowrap">
                        Original Audio • Trending Sound
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/30 rounded-full blur-3xl -z-10 mix-blend-multiply" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply" />
          </div>
        </div>
      </div>
    </section>
  );
}
