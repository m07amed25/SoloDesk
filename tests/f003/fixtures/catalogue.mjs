export const catalogue = Object.freeze({
  version: 1,
  feature: "F003",
  scenarios: Array.from(
    { length: 32 },
    (_, i) => `F003:A-${String(i + 1).padStart(2, "0")}`,
  ),
  suites: [
    "F003:unit",
    "F003:adapters",
    "F003:errors",
    "F003:source-quality",
    "F003:runtime",
  ],
});
