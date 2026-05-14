export async function parallelMap<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const n = Math.max(1, concurrency);
  let next = 0;
  async function pull() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        await worker(items[i]!, i);
      } catch (err) {
        console.error(`  ! item ${i} failed:`, (err as Error).message);
      }
    }
  }
  await Promise.all(Array.from({ length: n }, () => pull()));
}
