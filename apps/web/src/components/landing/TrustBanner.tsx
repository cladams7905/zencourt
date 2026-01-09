import { Building2, Home, MapPin, Building, Castle, Hotel } from "lucide-react";

const companies = [
  { name: "LUXE ESTATES", icon: Building2 },
  { name: "PREMIER HOMES", icon: Building },
  { name: "SKYLINE REALTY", icon: MapPin },
  { name: "URBAN LIVING", icon: Home },
  { name: "COASTAL GROUP", icon: Hotel },
  { name: "MODERN NEST", icon: Castle }
];

export function TrustBanner() {
  return (
    <section className="border-y border-border bg-accent/20 py-10 overflow-hidden">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Trusted by realtors at
        </p>
      </div>
      <div className="relative w-full max-w-[100vw] overflow-hidden">
        <div className="flex animate-scroll gap-16 md:gap-32 px-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Duplicate the array twice for seamless loop */}
          {[...companies, ...companies].map((company, index) => {
            const Icon = company.icon;
            return (
              <div
                key={`${company.name}-${index}`}
                className="flex items-center gap-3 font-header text-2xl font-bold text-foreground whitespace-nowrap"
              >
                <Icon className="h-8 w-8" />
                {company.name}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
