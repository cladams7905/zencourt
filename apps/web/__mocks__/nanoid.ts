let counter = 0;

export const nanoid = (size = 21): string => {
  counter += 1;
  const suffix = String(counter).padStart(4, "0");
  return `mockid${suffix}`.slice(0, size);
};
