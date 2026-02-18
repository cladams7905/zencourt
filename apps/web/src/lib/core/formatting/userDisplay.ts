import type { CurrentUser } from "@stackframe/stack";

export function getUserDisplayNames(user: CurrentUser): {
  headerName: string;
  sidebarName: string;
} {
  const { email, emailUsername } = getUserEmailInfo(user);
  const { displayName, nameParts } = getUserNameParts(user);
  const isGoogleUser = isGoogleUserAccount(user);

  const headerName = isGoogleUser
    ? nameParts[0] || displayName || emailUsername || "there"
    : emailUsername || email || displayName || "there";

  const sidebarName = isGoogleUser
    ? nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : displayName || emailUsername || email || "User"
    : email || emailUsername || displayName || "User";

  return { headerName, sidebarName };
}

export function getUserEmailInfo(user: CurrentUser): {
  email: string;
  emailUsername: string;
} {
  const email = user.primaryEmail ?? "";
  const emailUsername = email.split("@")[0] ?? "";
  return { email, emailUsername };
}

export function getUserNameParts(user: CurrentUser): {
  displayName: string;
  nameParts: string[];
} {
  const displayName = user.displayName?.trim() ?? "";
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  return { displayName, nameParts };
}

export function getDefaultAgentName(user: CurrentUser): string {
  const { nameParts } = getUserNameParts(user);
  if (nameParts.length >= 2) {
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  }
  return "";
}

export function getDefaultHeadshotUrl(user: CurrentUser): string {
  return isGoogleUserAccount(user) ? user.profileImageUrl ?? "" : "";
}

export function isGoogleUserAccount(user: CurrentUser): boolean {
  return (
    user.oauthProviders?.some((provider) => provider.id === "google") ?? false
  );
}

export function getLocationLabel(location?: string | null): string {
  if (!location) {
    return "Location not set";
  }
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return location;
}

export function getPaymentPlanLabel(paymentPlan?: string | null): string {
  const paymentPlanLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    enterprise: "Enterprise"
  };

  return paymentPlanLabels[paymentPlan ?? ""] ?? "Free";
}
