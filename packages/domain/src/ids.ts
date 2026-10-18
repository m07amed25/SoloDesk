import {fail, ok, record, type Result} from './integers.ts';
export const ID_KINDS = ['workspace','actor','device','project','resource','operation','request','receipt','diagnostic'] as const;
export type IdKind = typeof ID_KINDS[number];
export type Id<K extends IdKind = IdKind> = Readonly<{kind: K; value: string}>;
export function id<K extends IdKind>(value: unknown, expected: K): Result<Id<K>> {
  if (!record(value,['kind','value']) || value.kind !== expected || !ID_KINDS.includes(expected)) return fail('invalid_type');
  if (typeof value.value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.value)) return fail('invalid_format');
  return ok(Object.freeze({kind:expected,value:value.value}));
}
