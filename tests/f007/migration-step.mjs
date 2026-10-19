import { createHash } from "node:crypto";
import { initialSchema } from "../../app/main/persistence/schema/migrations/0001_initial_schema.ts";

const sql = "ALTER TABLE _entity_example ADD COLUMN qualification_tag TEXT";
export const addQualificationTag = Object.freeze({
  version: 2,
  name: "0002_add_qualification_tag",
  checksum: createHash("sha256").update(sql).digest("hex"),
  up(db) { db.exec(sql); },
  verify(db) { return db.pragma("table_info(_entity_example)").some((column) => column.name === "qualification_tag"); },
});
export const steps = [initialSchema, addQualificationTag];
