import { Navigation } from "./Navigation";
import { Hero } from "./Hero";
import { TrustBanner } from "./TrustBanner";
import { ContentGallery } from "./ContentGallery";
import { FeatureSpotlight1 } from "./FeatureSpotlight1";
import { FeatureSpotlight2 } from "./FeatureSpotlight2";
import { Stats } from "./Stats";
import { Testimonials } from "./Testimonials";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <TrustBanner />
      <ContentGallery />
      <FeatureSpotlight1 />
      <FeatureSpotlight2 />
      <Stats />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
}
