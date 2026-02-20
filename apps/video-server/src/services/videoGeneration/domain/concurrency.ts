export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const max = Math.max(1, limit);
  let index = 0;
  const workers = Array.from({ length: Math.min(max, items.length) }).map(
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await handler(current);
      }
    }
  );

  await Promise.all(workers);
}
