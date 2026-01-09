import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "Zencourt has completely transformed my workflow. I used to spend hours on Canva; now my social media runs itself while I'm at showings.",
    author: "Elena Rodriguez",
    role: "Luxury Agent, Miami"
  },
  {
    quote:
      "The AI actually sounds like me. That was my biggest worry, but the voice calibration is spot on. My engagement has doubled in just three months.",
    author: "James Thorne",
    role: "Broker, New York"
  },
  {
    quote:
      "The video reels it generates from static listing photos are incredible. I got three qualified leads from my first automated post. Highly recommended.",
    author: "Sarah Jenkins",
    role: "Realtor, Austin"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-background overflow-hidden" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-display-md font-header font-semibold text-foreground mb-4">
            Loved by Top Agents
          </h2>
          <p className="text-body-md text-muted-foreground">
            Join thousands of realtors growing their business with Zencourt.
          </p>
        </div>

        <div className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="min-w-[300px] md:min-w-[400px] bg-accent/20 p-8 rounded-2xl snap-center border border-border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 mb-6 text-foreground">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-current"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <p className="text-lg text-foreground font-spartan italic mb-8">
                  &quot;{testimonial.quote}&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 border-t border-border/50 pt-6">
                <div className="w-12 h-12 bg-border rounded-full overflow-hidden" />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
