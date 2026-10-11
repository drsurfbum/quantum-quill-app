import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;
  if (res.status === 401) queryClient.setQueryData(["/api/user"], null);
  const text = await res.text();
  let message = `${res.status}: ${res.statusText}`;
  try { message = JSON.parse(text).message || message; } catch { /* Use status for non-JSON errors. */ }
  throw new Error(message);
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method, headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data), credentials: "same-origin", mode: "same-origin",
  });
  await throwIfResNotOk(res);
  return res;
}
export const getQueryFn: <T>(options: { on401: "returnNull" | "throw" }) => QueryFunction<T> =
  ({ on401 }) => async ({ queryKey, signal }) => {
    const res = await fetch(queryKey[0] as string, { credentials: "same-origin", mode: "same-origin", signal });
    if (on401 === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);
    return res.json();
  };
export const queryClient = new QueryClient({ defaultOptions: {
  queries: { queryFn: getQueryFn({ on401: "throw" }), refetchInterval: false, refetchOnWindowFocus: false, staleTime: Infinity, retry: false },
  mutations: { retry: false },
} });
