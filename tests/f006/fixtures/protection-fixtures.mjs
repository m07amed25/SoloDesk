import { createHash } from "node:crypto";

export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const text = (value) => Buffer.from(value, "utf8");

export const fixtures = Object.freeze({
  a: Object.freeze({
    profileId: "synthetic-a",
    fixtureId: "f006-synthetic-a-v1",
    records: Object.freeze(["A6-EN-VELVET-OTTER-41", "A6-AR-شُعاع-النيل-٧٣"]),
    searchTerm: "شُعاع",
    fileBytes: Buffer.from([0x00, 0xff, 0x19, 0x7f, ...text("A6-BINARY-مرجان"), 0x00]),
  }),
  b: Object.freeze({
    profileId: "synthetic-b",
    fixtureId: "f006-synthetic-b-v1",
    records: Object.freeze(["B6-EN-COPPER-HERON-92", "B6-AR-مِرآة-القمر-٢٨"]),
    searchTerm: "مِرآة",
    fileBytes: Buffer.from([0x00, 0xfe, 0x29, 0x6f, ...text("B6-BINARY-زمرد"), 0x00]),
  }),
});

export const expected = Object.freeze(Object.fromEntries(
  Object.entries(fixtures).map(([name, fixture]) => [name, Object.freeze({
    recordsDigest: digest(text(JSON.stringify(fixture.records))),
    fileDigest: digest(fixture.fileBytes),
  })]),
));

export const rawMarkers = Object.freeze(Object.values(fixtures).flatMap((fixture) => [
  ...fixture.records.map((record) => text(record)),
  text(fixture.searchTerm),
  fixture.fileBytes.subarray(4, -1),
]));
