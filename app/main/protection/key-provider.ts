import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { safeStorage, app } from "electron";
import type { DeviceKeyBinding } from "./types.ts";

export type KeyContext = Readonly<{
  identityBindingId: string;
  dataSetId: string;
  generation: string;
}>;
export type KeyHandle = Readonly<{ binding: DeviceKeyBinding; key: Buffer }>;
export type KeyFailure =
  | "vault_locked"
  | "key_missing"
  | "protection_denied"
  | "unprotected_backend"
  | "integrity_failed";
export class KeyUnavailable extends Error {
  readonly reason: KeyFailure;
  constructor(reason: KeyFailure) {
    super(reason);
    this.reason = reason;
  }
}

type WrappedPayload = { version: 1; context: KeyContext; keyHex: string };
type Envelope = { version: 1; bindingId: string; wrapped: string };

function assertContext(context: KeyContext): void {
  if (
    ![context.identityBindingId, context.dataSetId, context.generation].every(
      (value) => /^[a-zA-Z0-9_-]{1,96}$/.test(value),
    )
  ) {
    throw new KeyUnavailable("protection_denied");
  }
}
function sameContext(a: KeyContext, b: KeyContext): boolean {
  return (
    a.identityBindingId === b.identityBindingId &&
    a.dataSetId === b.dataSetId &&
    a.generation === b.generation
  );
}

/** Main-process-only OS wrapper. The payload binds key bytes to an exact identity/data set/generation. */
export class ElectronKeyProvider {
  assertAvailable(): void {
    this.checkAvailable();
  }

  /**
   * Classify actual provider availability exactly as the DeviceKeyBinding model requires.
   * No key value, path or exception detail is exposed.
   */
  classifyAvailability(): DeviceKeyBinding["availability"] {
    if (!app.isReady()) return "denied";
    if (process.platform === "linux") {
      try {
        const backend = safeStorage.getSelectedStorageBackend();
        if (backend === "basic_text" || backend === "unknown")
          return "unprotected";
      } catch {
        return "denied";
      }
    }
    try {
      if (!safeStorage.isEncryptionAvailable()) return "locked";
    } catch {
      return "denied";
    }
    return "available";
  }

  private checkAvailable(): void {
    const availability = this.classifyAvailability();
    if (availability === "available") return;
    const reason: KeyFailure =
      availability === "unprotected"
        ? "unprotected_backend"
        : availability === "locked"
          ? "vault_locked"
          : "protection_denied";
    throw new KeyUnavailable(reason);
  }

  async create(envelopePath: string, context: KeyContext): Promise<KeyHandle> {
    assertContext(context);
    this.checkAvailable();
    const key = randomBytes(32);
    const bindingId = randomUUID();
    try {
      const payload: WrappedPayload = {
        version: 1,
        context,
        keyHex: key.toString("hex"),
      };
      const wrapped = safeStorage.encryptString(JSON.stringify(payload));
      const envelope: Envelope = {
        version: 1,
        bindingId,
        wrapped: wrapped.toString("base64"),
      };
      await writeFile(envelopePath, JSON.stringify(envelope), {
        flag: "wx",
        mode: 0o600,
      });
      return { key, binding: this.binding(bindingId, context) };
    } catch (error) {
      key.fill(0);
      if (error instanceof KeyUnavailable) throw error;
      throw new KeyUnavailable("protection_denied");
    }
  }

  async open(envelopePath: string, context: KeyContext): Promise<KeyHandle> {
    assertContext(context);
    this.checkAvailable();
    let bytes: Buffer;
    try {
      bytes = await readFile(envelopePath);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        throw new KeyUnavailable("key_missing");
      throw new KeyUnavailable("protection_denied");
    }
    try {
      const envelope = JSON.parse(bytes.toString("utf8")) as Envelope;
      if (
        envelope.version !== 1 ||
        typeof envelope.bindingId !== "string" ||
        !/^[0-9a-f-]{36}$/.test(envelope.bindingId) ||
        typeof envelope.wrapped !== "string" ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.wrapped)
      )
        throw new Error("envelope");
      const payload = JSON.parse(
        safeStorage.decryptString(Buffer.from(envelope.wrapped, "base64")),
      ) as WrappedPayload;
      if (
        payload.version !== 1 ||
        !sameContext(payload.context, context) ||
        typeof payload.keyHex !== "string" ||
        !/^[0-9a-f]{64}$/.test(payload.keyHex)
      )
        throw new Error("binding");
      return {
        key: Buffer.from(payload.keyHex, "hex"),
        binding: this.binding(envelope.bindingId, context),
      };
    } catch {
      throw new KeyUnavailable("integrity_failed");
    }
  }

  private binding(bindingId: string, context: KeyContext): DeviceKeyBinding {
    return Object.freeze({
      bindingId,
      ...context,
      providerClass: "os_protected" as const,
      availability: "available" as const,
    });
  }
}
