import crypto from "node:crypto";

export class EnrollmentEmulator {
  #state = { intents: new Map(), enrollments: new Map(), receipts: new Map(), evidence: new Map() };
  #queue = Promise.resolve();

  constructor(options = {}) {
    this.failAt = options.failAt;
  }

  async enroll(account, request) {
    const run = this.#queue.then(() => this.#transaction(account, request));
    this.#queue = run.catch(() => {});
    return run;
  }

  #transaction(account, request) {
    const snapshot = structuredClone(this.#state);
    try {
      const key = `${account.issuerId}\u0000${account.subjectId}\u0000${request.enrollmentIntentId}`;
      const existing = this.#state.intents.get(key);
      if (existing) {
        if (existing.requestDigest !== request.requestDigest) throw new Error("changed_intent");
        return existing.result;
      }

      const installationKey = `${account.issuerId}\u0000${account.subjectId}\u0000${request.installationContextId}`;
      if (this.#state.enrollments.has(installationKey)) throw new Error("installation_already_enrolled");
      this.#fail("intent");

      const deviceEnrollmentId = crypto.randomUUID();
      const deviceId = crypto.randomUUID();
      const receiptId = crypto.randomUUID();
      const evidenceId = crypto.randomUUID();
      const result = Object.freeze({ status: "enrolled", deviceEnrollmentId, deviceId, receiptId });
      this.#state.intents.set(key, { requestDigest: request.requestDigest, result });
      this.#fail("enrollment");
      this.#state.enrollments.set(installationKey, { ...request, ...result, ...account });
      this.#fail("receipt");
      this.#state.receipts.set(receiptId, { enrollmentIntentId: request.enrollmentIntentId, deviceEnrollmentId });
      this.#fail("evidence");
      this.#state.evidence.set(evidenceId, { enrollmentIntentId: request.enrollmentIntentId, outcome: "accepted" });
      return result;
    } catch (error) {
      this.#state = snapshot;
      throw error;
    }
  }

  async result(account, enrollmentIntentId) {
    const key = `${account.issuerId}\u0000${account.subjectId}\u0000${enrollmentIntentId}`;
    return this.#state.intents.get(key)?.result ?? null;
  }

  seedResult(account, request, status) {
    const key = `${account.issuerId}\u0000${account.subjectId}\u0000${request.enrollmentIntentId}`;
    this.#state.intents.set(key, {
      requestDigest: request.requestDigest,
      result: Object.freeze({ status }),
    });
  }

  counts() {
    return {
      intents: this.#state.intents.size,
      enrollments: this.#state.enrollments.size,
      receipts: this.#state.receipts.size,
      evidence: this.#state.evidence.size,
    };
  }

  #fail(point) {
    if (this.failAt === point) throw new Error(`synthetic_failure_${point}`);
  }
}

