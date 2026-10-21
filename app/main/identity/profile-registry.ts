import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { deriveIdentityPaths, type ProtectedIdentityPaths } from "./protected-identity-store.ts";

export type AccountProfileRegistration = Readonly<{
  profileId: string;
  issuerId: string;
  subjectId: string;
  protectionBindingId: string;
  paths: ProtectedIdentityPaths;
}>;

type StoredRegistration = Omit<AccountProfileRegistration, "paths">;

export class IdentityProfileRegistry {
  private readonly userData: string;
  private readonly registryPath: string;

  constructor(userData: string) {
    this.userData = userData;
    this.registryPath = path.join(userData, "identities", "registry.v1.json");
  }

  bind(issuerId: string, subjectId: string): AccountProfileRegistration {
    if (!issuerId || issuerId.length > 512 || !subjectId || subjectId.length > 256)
      throw new Error("invalid_account_binding");
    const entries = this.load();
    const existing = entries.find(
      (entry) => entry.issuerId === issuerId && entry.subjectId === subjectId,
    );
    if (existing) return this.withPaths(existing);

    const profileId = `p${crypto.randomBytes(15).toString("hex")}`;
    const entry = Object.freeze({
      profileId,
      issuerId,
      subjectId,
      protectionBindingId: `protection:${profileId}`,
    });
    this.save([...entries, entry]);
    return this.withPaths(entry);
  }

  get(profileId: string): AccountProfileRegistration | null {
    const entry = this.load().find((candidate) => candidate.profileId === profileId);
    return entry ? this.withPaths(entry) : null;
  }

  assertBinding(profileId: string, issuerId: string, subjectId: string): void {
    const entry = this.get(profileId);
    if (!entry || entry.issuerId !== issuerId || entry.subjectId !== subjectId)
      throw new Error("profile_binding_mismatch");
  }

  private load(): StoredRegistration[] {
    if (!fs.existsSync(this.registryPath)) return [];
    let value: unknown;
    try {
      value = JSON.parse(fs.readFileSync(this.registryPath, "utf8"));
    } catch {
      throw new Error("corrupt_profile_registry");
    }
    if (
      !Array.isArray(value) ||
      value.some((entry) =>
        !entry ||
        typeof entry !== "object" ||
        !/^[a-z][a-z0-9]{30}$/.test(String(entry.profileId)) ||
        typeof entry.issuerId !== "string" ||
        typeof entry.subjectId !== "string" ||
        entry.protectionBindingId !== `protection:${entry.profileId}`
      )
    ) throw new Error("unsupported_profile_registry");
    const pairs = new Set(value.map((entry) => `${entry.issuerId}\u0000${entry.subjectId}`));
    const ids = new Set(value.map((entry) => entry.profileId));
    if (pairs.size !== value.length || ids.size !== value.length)
      throw new Error("profile_registry_conflict");
    return value as StoredRegistration[];
  }

  private save(entries: readonly StoredRegistration[]): void {
    const directory = path.dirname(this.registryPath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.registryPath}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(entries, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.registryPath);
  }

  private withPaths(entry: StoredRegistration): AccountProfileRegistration {
    return Object.freeze({ ...entry, paths: deriveIdentityPaths(this.userData, entry.profileId) });
  }
}
