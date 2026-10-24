import type { RequestHandler } from "express";

/** Bound validation work before schema parsing. The byte limit alone permits
 * hundreds of thousands of invalid array items and expensive error allocation.
 * Prose is stored as a string: long chapters do not consume this item budget. */
export const boundRequestStructure: RequestHandler = (req, res, next) => {
  const pending: Array<{ value: unknown; depth: number }> = [{ value: req.body, depth: 0 }];
  let remaining = 10_000;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (--remaining < 0 || depth > 40) {
      res.status(413).json({ code: "REQUEST_TOO_COMPLEX", message: "This update contains too many fields or nested items. Split it into smaller updates; your draft has not been saved." });
      return;
    }
    // Legacy Bible fields can carry JSON strings. Inspect without rewriting them.
    if (typeof value === "string" && /^[\s]*[\[{]/.test(value)) {
      try { pending.push({ value: JSON.parse(value), depth: depth + 1 }); }
      catch { /* Ordinary prose beginning with a bracket remains prose. */ }
    }
    if (value && typeof value === "object") {
      const children = Object.values(value);
      if (children.length + pending.length > remaining) {
        res.status(413).json({ code: "REQUEST_TOO_COMPLEX", message: "This update contains too many fields or items. Split it into smaller updates; your draft has not been saved." });
        return;
      }
      for (const child of children) pending.push({ value: child, depth: depth + 1 });
    }
  }
  next();
};
