export const toNullableString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const toNullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatListingPrice = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return "";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Number(digitsOnly));

  return `$${formatted}`;
};

export const roundBathroomsToHalfStep = (value: number) => {
  return Math.round(value * 2) / 2;
};
