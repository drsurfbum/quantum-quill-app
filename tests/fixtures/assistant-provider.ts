import { setTimeout as pause } from "node:timers/promises";
import type { AssistantRuntime } from "../../server/assistant/provider";
import { AssistantUsage } from "../../server/assistant/usage";

export function assistantFixture(): AssistantRuntime {
  return {
    label: "Test fixture",
    usage: new AssistantUsage(":memory:", 100, 100),
    async *stream({ sources, question }, signal) {
      yield sources.length
        ? "Suggestion: give the navigator a choice with a cost. [1]"
        : "Suggestion: give the navigator a choice with a cost.";
      await pause(question === "Wait for navigation." ? 15000 : 300, undefined, { signal });
      yield " What would she risk to learn the truth?";
    },
  };
}
