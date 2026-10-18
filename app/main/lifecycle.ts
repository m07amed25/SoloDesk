export type AppState = "starting" | "ready" | "draining" | "closed" | "failed";
export type WindowPhase =
  | "opening"
  | "visible"
  | "minimized"
  | "closing"
  | "closed";
export type ShutdownResult = Readonly<{
  reason: string;
  outcome: "completed" | "interrupted";
  saved: false;
}>;

export class LifecycleCoordinator {
  readonly processEpoch = globalThis.crypto.randomUUID();
  lockHeld = false;
  private current: AppState = "starting";
  private readonly work = new Set<Promise<unknown>>();
  private readonly listeners = new Set<(state: AppState) => void>();
  private readonly drainMs: number;
  private draining?: Promise<ShutdownResult>;
  private terminal?: ShutdownResult;

  constructor(options: { drainMs?: number } = {}) {
    this.drainMs = options.drainMs ?? 5000;
  }

  get state(): AppState {
    return this.current;
  }
  canAccept(): boolean {
    return this.current === "ready";
  }

  onState(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private transition(state: AppState): void {
    this.current = state;
    for (const listener of this.listeners) listener(state);
    if (state === "closed" || state === "failed") this.listeners.clear();
  }

  ready(): void {
    if (this.current !== "starting")
      throw new Error("invalid-lifecycle-transition");
    this.transition("ready");
  }

  fail(reason: "startup" | "asset" | "preload" | "renderer"): void {
    void reason;
    if (this.current === "closed" || this.current === "failed") return;
    this.transition("failed");
  }

  track(work: Promise<unknown>): boolean {
    if (!this.canAccept()) return false;
    this.work.add(work);
    void work.then(
      () => this.work.delete(work),
      () => this.work.delete(work),
    );
    return true;
  }

  drain(reason: string): Promise<ShutdownResult> {
    if (this.current === "failed")
      return Promise.reject(new Error("failed-lifecycle"));
    if (this.terminal) return Promise.resolve(this.terminal);
    if (this.draining) return this.draining;
    if (this.current !== "ready" && this.current !== "starting")
      return Promise.reject(new Error("invalid-lifecycle-transition"));
    this.transition("draining");
    this.draining = this.settle(reason);
    return this.draining;
  }

  private async settle(reason: string): Promise<ShutdownResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finished = Promise.allSettled([...this.work]).then(() => true);
    const deadline = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), this.drainMs);
    });
    const completed = await Promise.race([finished, deadline]);
    if (timer) clearTimeout(timer);
    this.terminal = Object.freeze({
      reason,
      outcome: completed ? "completed" : "interrupted",
      saved: false,
    });
    this.transition("closed");
    return this.terminal;
  }
}
