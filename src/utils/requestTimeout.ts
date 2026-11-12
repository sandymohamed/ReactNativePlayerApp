export async function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("The IPTV server did not respond in time."));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
