import test from "node:test";
import assert from "node:assert/strict";
import { parseLink, externalDestination } from "../../../app/main/links.ts";

const record = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";

test("only exact canonical home and synthetic record grammar parse", () => {
  assert.deepEqual(parseLink("solodesk://open/home"), { kind: "home" });
  assert.deepEqual(
    parseLink(`solodesk://open/record/${record}?workspace=${workspace}`),
    { kind: "record", recordId: record, workspaceId: workspace },
  );
});

test("hostile and noncanonical links are denied before navigation", () => {
  for (const raw of [
    "SOLODESK://open/home",
    "solodesk://open/home?x=1",
    "solodesk://open/home#x",
    "solodesk://user@open/home",
    "solodesk://open:42/home",
    "solodesk://evil/home",
    "solodesk://open/../home",
    "solodesk://open/%68ome",
    "solodesk://open/home%2fother",
    "solodesk://open/home\\other",
    "solodesk://open/home\n",
    "solodesk://open/home?next=javascript:alert(1)",
    `solodesk://open/record/${record}?workspace=${workspace}&workspace=${workspace}`,
    "solodesk-app://ui/index.html",
    "https://example.com/",
    "x".repeat(2049),
  ]) assert.equal(parseLink(raw), null, raw.slice(0, 100));
});

test("production external destination catalogue is empty", () => {
  assert.equal(externalDestination("help"), null);
  assert.equal(externalDestination("https://example.com/"), null);
});
