import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Auth token management for Replit environment where cookies don't work consistently
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  console.log("Setting auth token:", token ? "token provided" : "token cleared");
  authToken = token;
  localStorage.setItem('authToken', token || '');
}

export function getAuthToken(): string | null {
  if (!authToken) {
    // Try to get from localStorage if not in memory
    const storedToken = localStorage.getItem('authToken');
    if (storedToken && storedToken.length > 0) {
      authToken = storedToken;
    }
  }
  return authToken;
}

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
  
  // Create headers with auth token if available
  const headers: Record<string, string> = data ? { 
    "Content-Type": "application/json" 
  } : {};
  
  // Add auth token from in-memory token or localStorage
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("Adding auth token to request headers");
  }
  
  // Use SameSite=Lax to match server configuration
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep for backward compatibility
    mode: "same-origin", // Ensures same-origin requests which helps with cookie handling
  });

  console.log(`Response status: ${res.status} for ${method} ${url}`);
  
  // Handle auth token in response if it's a login/register endpoint
  if (res.ok && (url === "/api/login" || url === "/api/register")) {
    try {
      const clonedRes = res.clone();
      const userData = await clonedRes.json();
      if (userData && userData.id) {
        // Use user ID as a simple token solution
        const tokenValue = `user-${userData.id}-${Date.now()}`;
        setAuthToken(tokenValue);
        console.log("Login/register successful - token saved");
      }
    } catch (e) {
      console.error("Failed to extract token from login response", e);
    }
  }
  
  // Clear token on logout or auth errors
  if ((url === "/api/logout" && res.ok) || res.status === 401) {
    setAuthToken(null);
    console.log("Clearing auth token due to logout or auth error");
  }
  
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
    
    // Prepare headers with auth token if available
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("Adding auth token to GET request");
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Keep for backward compatibility
      mode: "same-origin", // Ensures same-origin requests for cookie handling
      headers
    });

    console.log(`Response status: ${res.status} for GET ${queryKey[0]}`);
    
    // Clear token on auth errors
    if (res.status === 401) {
      setAuthToken(null);
      console.log("Clearing auth token due to 401 response");
    }

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
