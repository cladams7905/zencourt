let counter = 0;

export const nanoid = (size = 21): string => {
  counter += 1;
  const value = `sharedmock${String(counter).padStart(4, "0")}`;
  return value.slice(0, size);
};
