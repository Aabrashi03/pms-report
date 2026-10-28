export const AUTH_REQUEST_TIMEOUT_MS = 3_000;

const protectedPaths = new Set(["/", "/staff", "/cycles", "/reports", "/team"]);

export function isProtectedRoute(pathname: string, teamsEnabled: boolean) {
  return teamsEnabled && protectedPaths.has(pathname);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Authentication service timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
