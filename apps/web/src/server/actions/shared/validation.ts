export function requireNonEmptyString(value: string, errorMessage: string): string {
  if (!value || value.trim() === "") {
    throw new Error(errorMessage);
  }

  return value;
}

export function requireUserId(userId: string, errorMessage: string): string {
  return requireNonEmptyString(userId, errorMessage);
}

export function requireListingId(listingId: string, errorMessage: string): string {
  return requireNonEmptyString(listingId, errorMessage);
}

export function requireContentId(contentId: string, errorMessage: string): string {
  return requireNonEmptyString(contentId, errorMessage);
}

export function requireMediaId(mediaId: string, errorMessage: string): string {
  return requireNonEmptyString(mediaId, errorMessage);
}
