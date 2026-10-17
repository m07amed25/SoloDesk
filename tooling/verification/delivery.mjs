export function reviewState(record, context) {
  if (!record || record.source === "silence") return "pending";
  if (record.status === "withdrawn" || record.source === "withdrawn")
    return "withdrawn";
  if (
    record.source === "stale" ||
    (record.head && record.head !== context.head) ||
    (record.base && record.base !== context.base)
  )
    return "stale";
  // Authenticity is deliberately not accepted from editable JSON.
  return "unverified";
}
export function prepareAdoption(observed, checks) {
  const gate = checks.filter(
    (c) =>
      c.name === "F002 / automated-readiness" && Number.isSafeInteger(c.app_id),
  );
  return {
    outcome: observed.unavailable || gate.length !== 1 ? "blocked" : "prepared",
    observed_settings: observed,
    proposed_settings: {
      ...observed,
      required_checks: [
        ...new Set([
          ...(observed.required_checks || []),
          "F002 / automated-readiness",
        ]),
      ],
      required_reviews: observed.required_reviews || 0,
      strict: true,
      resolved_conversations: true,
    },
    check_identities: gate,
    recovery:
      "Restore reviewed working identity and verify checks; preserve stronger controls. Activation/reversion requires separate current authorization.",
    authority: "No settings writes or owner-source authentication",
  };
}
export function validatePack(pack) {
  if (
    pack.schema !== "solodesk.verification.pack" ||
    pack.schema_version !== 1 ||
    pack.phase !== "F002"
  )
    throw new Error("delivery-pack-family");
  for (const [key, prefix, count] of [
    ["requirements", "FR-", 30],
    ["acceptance", "A-", 27],
    ["success", "SC-", 11],
  ]) {
    if (!Array.isArray(pack[key]) || pack[key].length !== count)
      throw new Error("delivery-coverage-incomplete");
    const ids = new Set();
    for (let i = 1; i <= count; i++)
      ids.add(prefix + String(i).padStart(prefix === "A-" ? 2 : 3, "0"));
    for (const item of pack[key]) {
      if (
        !ids.delete(item.id) ||
        ![
          "passed",
          "failed",
          "not run",
          "unavailable",
          "stale",
          "not applicable",
        ].includes(item.status) ||
        !item.source
      )
        throw new Error("delivery-coverage-invalid");
    }
  }
  if (
    !Array.isArray(pack.findings) ||
    !Array.isArray(pack.observations) ||
    !pack.owner ||
    !pack.context
  )
    throw new Error("delivery-pack-incomplete");
  const coverageComplete = [
    ...pack.requirements,
    ...pack.acceptance,
    ...pack.success,
  ].every((x) => ["passed", "not applicable"].includes(x.status));
  if (
    pack.automated_ready &&
    (pack.automated_summary?.automated_ready !== true ||
      !pack.automated_summary.source ||
      pack.findings.some((f) => f.blocking && f.stage !== "delivery"))
  )
    throw new Error("automation-readiness-contradiction");
  if (pack.owner.status === "approved")
    throw new Error("owner-source-unverified");
  return {
    structurally_valid: true,
    complete:
      pack.automated_ready === true &&
      coverageComplete &&
      !pack.findings.some((f) => f.blocking),
    owner_source_verification: "required",
  };
}
