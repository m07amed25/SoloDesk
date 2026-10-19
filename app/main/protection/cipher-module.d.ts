declare module "better-sqlite3-multiple-ciphers" {
  import type BetterSqlite3 from "better-sqlite3";
  export type NativeDatabase = BetterSqlite3.Database & {
    key(key: Buffer): number;
    rekey(key: Buffer): number;
  };
  const Database: {
    new (filename: string, options?: BetterSqlite3.Options): NativeDatabase;
  };
  export default Database;
}
