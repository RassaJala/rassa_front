// Shared timeout guard used by the publication wizard. Lives here so mobile
// and web never reimplement their own (review NF2). Web's AbortController
// variant was dead code; this is the robust promise-race form.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `La operación tardó más de ${String(ms / 1000)}s. Verificá tu conexión e intentá de nuevo.`,
        ),
      );
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}
