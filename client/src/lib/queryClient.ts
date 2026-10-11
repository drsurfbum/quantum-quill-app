import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}
export function currentAccount() { return queryClient.getQueryData<{ id: number }>(["/api/user"])?.id; }
export function clearAccount(expected: number | undefined) {
  if (currentAccount() !== expected) return;
  // Hide private UI synchronously; cancellation also prevents late query results.
  queryClient.setQueryData(["/api/user"], null);
  void queryClient.cancelQueries({ predicate: query => query.queryKey[0] !== "/api/user" });
  queryClient.removeQueries({ predicate: query => query.queryKey[0] !== "/api/user" });
}
const sessionUrl = (url: string) => /^\/api\/(user|login|register)$/.test(url);
async function throwIfResNotOk(res: Response, owner: number | undefined) {
  if (res.ok) return;
  const text = await res.text();
  let message = `${res.status}: ${res.statusText}`, code: string | undefined;
  try { const error = JSON.parse(text); message = error.message || message; code = error.code; } catch { /* Non-JSON gateway error. */ }
  if (res.status === 401 || code === "ACCOUNT_CHANGED") clearAccount(owner);
  throw new ApiError(message, res.status, code);
}
export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const owner = currentAccount();
  const res = await fetch(url, {
    method, headers: { ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(!sessionUrl(url) && owner ? { "X-QQ-Account": String(owner) } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data), credentials: "same-origin", mode: "same-origin",
  });
  await throwIfResNotOk(res, owner);
  // Mutation callbacks must not populate another account's cache either.
  if (!sessionUrl(url) && owner !== currentAccount()) throw new ApiError("Your account changed. The draft is kept for its owner.", 409, "ACCOUNT_CHANGED");
  const readJson = res.json.bind(res);
  res.json = async () => {
    const result = await readJson();
    if (!sessionUrl(url) && owner !== currentAccount()) throw new ApiError("Your account changed. Reload this page.", 409, "ACCOUNT_CHANGED");
    return result;
  };
  return res;
}
export const getQueryFn: <T>(options: { on401: "returnNull" | "throw" }) => QueryFunction<T> =
  ({ on401 }) => async ({ queryKey, signal }) => {
    const owner = currentAccount(), url = queryKey[0] as string;
    const res = await fetch(url, { credentials: "same-origin", mode: "same-origin", signal,
      headers: !sessionUrl(url) && owner ? { "X-QQ-Account": String(owner) } : {} });
    if (on401 === "returnNull" && res.status === 401) { clearAccount(owner); return null; }
    await throwIfResNotOk(res, owner);
    const result = await res.json();
    if (signal.aborted || owner !== currentAccount()) throw new ApiError("Your account changed. Reload this page.", 409, "ACCOUNT_CHANGED");
    if (url === "/api/user" && owner !== result?.id) clearAccount(owner);
    return result;
  };
export const queryClient = new QueryClient({ defaultOptions: {
  queries: { queryFn: getQueryFn({ on401: "throw" }), refetchInterval: false, refetchOnWindowFocus: false, staleTime: Infinity, retry: false },
  mutations: { retry: false },
} });
