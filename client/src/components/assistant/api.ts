import { clearAccount, currentAccount } from "@/lib/queryClient";
import type { AssistantEvent } from "@shared/workspace-assistant";

export async function request(
  base: string,
  account: number,
  path: string,
  signal: AbortSignal,
  body?: unknown,
) {
  if (currentAccount() !== account) throw new Error("Account changed.");
  const result = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    signal,
    credentials: "same-origin",
    mode: "same-origin",
    headers: {
      "X-QQ-Account": String(account),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!result.ok) {
    const error = await result.json().catch(() => ({}));
    if (result.status === 401 || error.code === "ACCOUNT_CHANGED") clearAccount(account);
    throw new Error(error.message || "The assistant could not connect.");
  }
  if (signal.aborted || currentAccount() !== account) throw new Error("Account changed.");
  return result;
}
export async function readAnswer(response: Response, receive: (e: AssistantEvent) => void) {
  if (!response.body || !response.headers.get("content-type")?.includes("application/x-ndjson"))
    throw new Error("The assistant is unavailable.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new Error("The response was interrupted.");
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const event: AssistantEvent = JSON.parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (event.type === "error") throw new Error("The provider could not finish this response.");
        receive(event);
        if (event.type === "done") return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
