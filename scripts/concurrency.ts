export async function parallelMap<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  options: { timeoutMs?: number } = {},
): Promise<void> {
  if (items.length === 0) return;
  const n = Math.max(1, concurrency);
  const timeoutMs = options.timeoutMs ?? 0;
  let next = 0;
  async function pull() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        if (timeoutMs > 0) {
          await Promise.race([
            worker(items[i]!, i),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs),
            ),
          ]);
        } else {
          await worker(items[i]!, i);
        }
      } catch (err) {
        console.error(`  ! item ${i} failed:`, (err as Error).message);
      }
    }
  }
  await Promise.all(Array.from({ length: n }, () => pull()));
}
