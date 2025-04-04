import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse the response as JSON first
      const data = await res.json();
      throw new Error(data.message || `${res.status}: ${res.statusText}`);
    } catch (e) {
      if (e instanceof Error) throw e;
      // If JSON parsing fails, fall back to text
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`);
  
  // Use SameSite=Lax to match server configuration
  const res = await fetch(url, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
    } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // This is crucial for cookies
    mode: "same-origin", // Ensures same-origin requests which helps with cookie handling
  });

  console.log(`Response status: ${res.status} for ${method} ${url}`);
  
  // Debug cookies
  const cookies = document.cookie;
  console.log(`Current cookies: ${cookies}`);
  
  if (!res.ok && res.status === 401) {
    console.log("Authentication error: User not authenticated");
  }
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Making GET request to ${queryKey[0]}`);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      mode: "same-origin", // Ensures same-origin requests for cookie handling
    });

    console.log(`Response status: ${res.status} for GET ${queryKey[0]}`);
    
    // Debug cookies
    const cookies = document.cookie;
    console.log(`Current cookies: ${cookies}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Returning null for unauthorized request to ${queryKey[0]}`);
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
