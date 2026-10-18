import { plainData } from "../../packages/contracts/src/validation.ts";
import { utf8Length } from "../../packages/contracts/src/bounds.ts";

export const DEFAULT_PROFILE = "default";
export const TEST_PROFILES = Object.freeze(["synthetic-a", "synthetic-b"]);

export type Activation = Readonly<{ profileId: string; link?: string }>;
export type OwnedView = { focus(): void };

export function parseActivation(input: unknown): Activation | null {
  const safe = plainData(input);
  if (
    !safe.ok ||
    !safe.value ||
    typeof safe.value !== "object" ||
    Array.isArray(safe.value)
  )
    return null;

  const value = safe.value as Record<string, unknown>;
  const keys = Object.keys(value);

  if (
    !keys.every((key) => ["version", "profileId", "link"].includes(key)) ||
    !keys.includes("version") ||
    !keys.includes("profileId") ||
    value.version !== 1 ||
    typeof value.profileId !== "string" ||
    !/^[a-z][a-z0-9-]{0,31}$/.test(value.profileId) ||
    (value.link !== undefined && typeof value.link !== "string") ||
    utf8Length(JSON.stringify(value)) > 4096
  )
    return null;

  return Object.freeze({
    profileId: value.profileId,
    ...(typeof value.link === "string" ? { link: value.link } : {}),
  });
}

type Entry<T extends OwnedView> = {
  epoch: number;
  promise: Promise<T>;
  view?: T;
};

export class ProfileOwners<T extends OwnedView> {
  private readonly known: ReadonlySet<string>;
  private readonly entries = new Map<string, Entry<T>>();
  private nextEpoch = 0;

  constructor(profiles: readonly string[]) {
    this.known = new Set(profiles);
  }

  get size(): number {
    return this.entries.size;
  }
  hasProfile(profileId: string): boolean {
    return this.known.has(profileId);
  }
  current(profileId: string): T | undefined {
    return this.entries.get(profileId)?.view;
  }
  views(): readonly T[] {
    return [...this.entries.values()]
      .map((entry) => entry.view)
      .filter((view): view is T => view !== undefined);
  }
  epoch(profileId: string): number | undefined {
    return this.entries.get(profileId)?.epoch;
  }

  async activate(
    profileId: string,
    create: (profileId: string, epoch: number) => Promise<T>,
  ): Promise<T> {
    if (!this.known.has(profileId)) throw new Error("unknown-profile");
    const existing = this.entries.get(profileId);
    if (existing) {
      const view = await existing.promise;
      view.focus();
      return view;
    }
    const epoch = ++this.nextEpoch;
    const entry = { epoch } as Entry<T>;
    entry.promise = Promise.resolve().then(() => create(profileId, epoch));
    this.entries.set(profileId, entry);
    try {
      const view = await entry.promise;
      if (this.entries.get(profileId) !== entry)
        throw new Error("stale-profile-creation");
      entry.view = view;
      return view;
    } catch (error) {
      if (this.entries.get(profileId) === entry) this.entries.delete(profileId);
      throw error;
    }
  }

  close(profileId: string, view: T): void {
    const entry = this.entries.get(profileId);
    if (entry?.view === view) this.entries.delete(profileId);
  }

  clear(): void {
    this.entries.clear();
  }
}
