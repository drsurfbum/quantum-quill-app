export type SaveStatus = "saved" | "typing" | "saving" | "error";
export type SavePatch = Record<string, unknown>;

/** One serial writer per record. Pending edits survive editor unmounts. */
export class SaveQueue {
  private pending: SavePatch | null = null;
  private inFlight: SavePatch | null = null;
  private running: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private checkpointTimer: ReturnType<typeof setTimeout> | undefined;
  private status: SaveStatus = "saved";
  private listeners = new Set<() => void>();
  error: Error | null = null;

  constructor(private write: (patch: SavePatch) => Promise<unknown>, private delay = 750, private maxWait = 5000, private checkpoint?: (draft: SavePatch) => void) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getStatus = () => this.status;
  getDraft = (): SavePatch => ({ ...this.inFlight, ...this.pending });
  private notify(status: SaveStatus) { this.status = status; this.checkpoint?.(this.getDraft()); this.listeners.forEach(listener => listener()); }
  discard = () => {
    if (this.running) throw new Error("Wait for the current save to finish");
    this.clearTimers(); this.pending = null; this.error = null; this.notify("saved");
  };

  enqueue = (patch: SavePatch) => {
    this.pending = { ...this.pending, ...patch };
    this.error = null;
    this.notify(this.running ? "saving" : "typing");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, this.delay);
    // Sustained typing must not defer persistence indefinitely.
    if (!this.checkpointTimer) this.checkpointTimer = setTimeout(() => { void this.flush(); }, this.maxWait);
  };
  private clearTimers() {
    clearTimeout(this.timer);
    clearTimeout(this.checkpointTimer);
    this.timer = undefined;
    this.checkpointTimer = undefined;
  }
  flush = (): Promise<boolean> => {
    this.clearTimers();
    if (this.running) return this.running;
    if (!this.pending) return Promise.resolve(true);
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  };
  private async drain(): Promise<boolean> {
    while (this.pending) {
      const patch = this.pending;
      this.pending = null;
      this.inFlight = patch;
      this.error = null;
      this.notify("saving");
      try { await this.write(patch); }
      catch (error) {
        // Newer fields win; unrelated fields in the failed write are retained.
        this.pending = { ...patch, ...(this.pending || {}) };
        this.inFlight = null;
        this.error = error instanceof Error ? error : new Error("Unable to save");
        this.clearTimers();
        this.notify("error");
        return false;
      }
      this.inFlight = null;
      this.checkpoint?.(this.getDraft());
    }
    this.clearTimers();
    this.notify("saved");
    return true;
  }
}
