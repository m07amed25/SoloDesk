import { ISSUE_KEYS, ISSUE_PATHS } from "./issues.ts";
import { ok, fail, record, type Result } from "../../domain/src/integers.ts";
import { id, type Id, type IdKind } from "../../domain/src/ids.ts";
import { BOUNDS, unicodeSize, validKey, utf8Length } from "./bounds.ts";
export type Data =
  | null
  | boolean
  | string
  | number
  | readonly Data[]
  | Readonly<{ [key: string]: Data }>;
export function plainData(input: unknown): Result<Data> {
  let nodes = 0;
  const ancestors = new Set<object>();
  function visit(value: unknown, depth: number): Data {
    if (++nodes > BOUNDS.nodes) throw new Error("limit");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (!unicodeSize(value)) throw new Error("string");
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0))
        throw new Error("number");
      return value;
    }
    if (
      typeof value !== "object" ||
      value === null ||
      depth >= BOUNDS.depth ||
      ancestors.has(value)
    )
      throw new Error("object");
    ancestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(value);
    let out: Data;
    if (Array.isArray(value)) {
      if (value.length > BOUNDS.array || keys.length !== value.length + 1)
        throw new Error("array");
      const a: Data[] = [];
      for (let i = 0; i < value.length; i++) {
        const d = descriptors[String(i)];
        if (!d || !("value" in d) || !d.enumerable) throw new Error("accessor");
        a.push(visit(d.value, depth + 1));
      }
      out = Object.freeze(a);
    } else {
      if (
        Object.getPrototypeOf(value) !== Object.prototype ||
        keys.length > BOUNDS.members
      )
        throw new Error("record");
      const o: Record<string, Data> = {};
      for (const key of keys) {
        if (typeof key !== "string" || !validKey(key)) throw new Error("key");
        const d = descriptors[key];
        if (!("value" in d) || !d.enumerable) throw new Error("accessor");
        o[key] = visit(d.value, depth + 1);
      }
      out = Object.freeze(o);
    }
    ancestors.delete(value);
    return out;
  }
  try {
    const value = visit(input, 0);
    if (utf8Length(JSON.stringify(value)) > BOUNDS.bytes)
      return fail("out_of_range");
    return ok(value);
  } catch {
    return fail("invalid_format");
  }
}
export type ScopedReference = Readonly<{
  kind: IdKind;
  id: Id;
  workspaceId: Id<"workspace">;
}>;
export function scopedReference(
  input: unknown,
  kind: IdKind,
  workspace: Id<"workspace">,
): Result<ScopedReference> {
  if (!record(input, ["kind", "id", "workspaceId"]) || input.kind !== kind)
    return fail("invalid_type");
  const resource = id(input.id, kind),
    tenant = id(input.workspaceId, "workspace");
  if (!resource.ok) return resource;
  if (!tenant.ok) return tenant;
  if (tenant.value.value !== workspace.value) return fail("incompatible_unit");
  return ok(
    Object.freeze({ kind, id: resource.value, workspaceId: tenant.value }),
  );
}
export class Issues {
  private items: Readonly<{
    key: string;
    path: readonly (string | number)[];
  }>[] = [];
  private truncated = false;
  add(key: string, path: readonly (string | number)[]): void {
    if (!(ISSUE_KEYS as readonly string[]).includes(key)) return;
    if (this.items.length >= BOUNDS.issues) {
      this.truncated = true;
      return;
    }
    if (
      path.length > BOUNDS.depth ||
      path.some((p) =>
        typeof p === "string"
          ? !(ISSUE_PATHS as readonly string[]).includes(p)
          : !Number.isInteger(p) || p < 0 || p >= BOUNDS.array,
      )
    )
      return;
    this.items.push(Object.freeze({ key, path: Object.freeze([...path]) }));
  }
  result() {
    return Object.freeze({
      issues: Object.freeze([...this.items]),
      issuesTruncated: this.truncated,
    });
  }
}
