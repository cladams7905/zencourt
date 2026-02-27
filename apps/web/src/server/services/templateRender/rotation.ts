type AsyncIndexStoreClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<unknown>;
};

export type TemplateHeaderRotationStore = {
  getIndex: (key: string) => Promise<number | null>;
  setIndex: (key: string, value: number) => Promise<void>;
};

export type TemplateImageRotationStore = {
  getIndex: (key: string) => number | null;
  setIndex: (key: string, value: number) => void;
};

export function createInMemoryTemplateHeaderRotationStore(): TemplateHeaderRotationStore {
  const state = new Map<string, number>();
  return {
    async getIndex(key: string) {
      return state.get(key) ?? null;
    },
    async setIndex(key: string, value: number) {
      state.set(key, value);
    }
  };
}

export function createInMemoryTemplateImageRotationStore(): TemplateImageRotationStore {
  const state = new Map<string, number>();
  return {
    getIndex(key: string) {
      return state.get(key) ?? null;
    },
    setIndex(key: string, value: number) {
      state.set(key, value);
    }
  };
}

export function createRedisTemplateHeaderRotationStore(
  client: AsyncIndexStoreClient
): TemplateHeaderRotationStore {
  return {
    async getIndex(key: string) {
      const value = await client.get<number>(key);
      return typeof value === "number" ? value : null;
    },
    async setIndex(key: string, value: number) {
      await client.set(key, value);
    }
  };
}
