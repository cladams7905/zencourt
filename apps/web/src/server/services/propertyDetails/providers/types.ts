export type PropertyDetailsProvider = {
  name: string;
  fetch(address: string): Promise<unknown | null>;
};
