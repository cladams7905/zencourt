import type { TargetAudience } from "@db/client";
import {
  Crown,
  Home,
  KeyRound,
  Palmtree,
  TrendingUp,
  Users,
  Briefcase,
  Shield
} from "lucide-react";

export const audienceCategories: {
  value: TargetAudience;
  label: string;
  description: string;
  icon: typeof Crown;
}[] = [
  {
    value: "first_time_homebuyers",
    label: "First-Time Homebuyers",
    description: "Mortgage basics, buyer programs, starter homes",
    icon: KeyRound
  },
  {
    value: "growing_families",
    label: "Growing Families",
    description: "School districts, family-friendly neighborhoods, space needs",
    icon: Users
  },
  {
    value: "real_estate_investors",
    label: "Real Estate Investors",
    description: "ROI analysis, rental properties, cash flow strategies",
    icon: TrendingUp
  },
  {
    value: "downsizers_retirees",
    label: "Downsizers & Retirees",
    description: "55+ communities, simplified living, retirement planning",
    icon: Home
  },
  {
    value: "luxury_homebuyers",
    label: "Luxury Homebuyers",
    description: "High-end properties, premium amenities, exclusive markets",
    icon: Crown
  },
  {
    value: "vacation_property_buyers",
    label: "Vacation Property Buyers",
    description: "Second homes, investment potential, seasonal ownership",
    icon: Palmtree
  },
  {
    value: "military_veterans",
    label: "Military Veterans",
    description: "VA loans, relocation services, military benefits",
    icon: Shield
  },
  {
    value: "job_transferees",
    label: "Relocators & Job Transferees",
    description: "Corporate relocations, remote moves, new-to-area buyers",
    icon: Briefcase
  }
];
