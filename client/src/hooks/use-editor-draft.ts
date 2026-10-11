import { useCallback, useRef, useState } from "react";

/** Update the current draft synchronously, even when React batches several field events.
 * Keep saving outside React state updaters, which React can replay in Strict Mode.
 */
export function useEditorDraft<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const update = useCallback((change: T | ((previous: T) => T)): T => {
    const next = typeof change === "function" ? (change as (previous: T) => T)(current.current) : change;
    current.current = next;
    setValue(next);
    return next;
  }, []);
  return [value, update] as const;
}
