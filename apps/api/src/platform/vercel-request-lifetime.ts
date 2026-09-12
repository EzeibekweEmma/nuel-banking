interface VercelRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface VercelRequestContextProvider {
  get?: () => VercelRequestContext;
}

const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

export function extendVercelRequestLifetime(
  promise: Promise<unknown>,
): boolean {
  const runtime = globalThis as typeof globalThis & {
    [VERCEL_REQUEST_CONTEXT]?: VercelRequestContextProvider;
  };
  const context = runtime[VERCEL_REQUEST_CONTEXT]?.get?.();
  if (!context?.waitUntil) return false;
  context.waitUntil(promise);
  return true;
}
