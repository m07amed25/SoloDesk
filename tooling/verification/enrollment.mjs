export function validateEnrollment(suite, files) {
  const categories = [
    "bilingual",
    "finance",
    "authorization",
    "sync",
    "documents",
    "desktop",
    "unit",
    "integration",
  ];
  if (
    !/^F\d{3,}:[a-z][a-z0-9-]*$/.test(suite.id) ||
    !suite.id.startsWith(`${suite.feature}:`)
  )
    throw new Error("suite-namespace");
  for (const key of [
    "entry_files",
    "positive",
    "negative",
    "categories",
    "scenarios",
  ])
    if (
      !Array.isArray(suite[key]) ||
      !suite[key].length ||
      new Set(suite[key]).size !== suite[key].length
    )
      throw new Error("suite-empty");
  if (
    suite.entry_files.some(
      (p) =>
        typeof p !== "string" ||
        p.includes("..") ||
        !p.startsWith("tests/") ||
        !files.includes(p),
    )
  )
    throw new Error("suite-entry-missing");
  if (
    suite.categories.some((c) => !categories.includes(c)) ||
    suite.scenarios.some((s) => !s.startsWith(`${suite.feature}:`))
  )
    throw new Error("suite-obligation");
  return true;
}
