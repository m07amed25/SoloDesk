# F003 Primitive and Bounds Contract

**Version**: proposed `F003-bounds-v1`, initial primitive schema 1. **Authority**: [specification](../spec.md), FR-005–FR-017. **Adoption**: finite values below are engineering proposals pending the F003 entry review, not approved financial or service policies. All fields are closed. Examples use synthetic profiles.

## Exact Limits and Counting

| Value                                                             | Proposed inclusive limit                                                  | Rejection / measurement                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Encoded request/result/event                                      | 262,144 UTF-8 bytes                                                       | Count original bytes before decoding; UTF-8 must be well formed                                                            |
| Container nesting                                                 | 16, root container depth 1                                                | Check before descending; scalar children do not add container depth                                                        |
| Total values                                                      | 4,096 nodes                                                               | Count every object, array and scalar including root; keys counted separately by member limits                              |
| Object members                                                    | 64 per object                                                             | Count decoded unique names; duplicate names are invalid rather than merged                                                 |
| Array entries                                                     | 1,000 per array                                                           | Check before growing collection                                                                                            |
| Ordinary string                                                   | 4,096 Unicode scalar values AND 16,384 decoded UTF-8 bytes                | Both limits apply; reject lone surrogates and malformed UTF-8; encoded escape bytes still count in envelope                |
| Schema key                                                        | 64 ASCII characters                                                       | Fixed allowlisted keys; no prototype-sensitive keys or arbitrary map keys                                                  |
| Operation kind / profile ID / message key                         | 64 ASCII characters                                                       | Lowercase named grammar unless a specific schema declares otherwise                                                        |
| Field issues                                                      | 32                                                                        | Stop collection; set `issuesTruncated: true`; never allocate all rejected issues first                                     |
| Public error                                                      | 16,384 encoded UTF-8 bytes                                                | Reject invalid internal construction; adapter uses a bounded SERVICE_UNAVAILABLE fallback preserving uncertainty              |
| Exact input integer/coefficient/numerator/denominator/minor units | Absolute value at most 10^38−1, at most 38 supplied digits excluding sign | Check supplied digits before BigInt and before normalization; no oversized reducible input                                 |
| Decimal scale                                                     | Integer 0–18                                                              | Scale is small numeric metadata; reject fractional/nonfinite/excessive scale                                               |
| Currency exponent                                                 | Integer 0–9                                                               | Technical representational ceiling; real precision/profile approval remains Q-03                                           |
| Seconds / revision                                                | 0–9,223,372,036,854,775,807                                               | Canonical text; timer field/product limits may be lower and remain Q-04                                                    |
| Scratch arithmetic magnitude                                      | At most 128 decimal digits excluding sign                                 | Preflight growth; check every intermediate; no unlimited powers/products                                                   |
| Euclidean remainder steps                                         | 1,024 per primitive operation including cross-cancellation                | Decrement shared operation budget; budget exhaustion is explicit failure                                                   |
| Calendar dates/instants                                           | Years 0001–9999                                                           | Validate calendar/clock fields and conversion range                                                                        |
| Optional original offset                                          | Integer −840 through +840 minutes                                         | Unknown-offset metadata is explicit; cannot silently equate unknown offset with known UTC                                  |
| Optional timezone label                                           | 64 ASCII characters                                                       | Syntax and length only in pure core; actual zone validity comes from declared consuming catalogue                          |
| Retry delay                                                       | Integer 1–3,600,000 milliseconds                                          | Only safe-to-retry results; caller cannot retry earlier; larger service delays become explicit unavailable/review outcomes |

Limits are independent conjunctions. Each ceiling needs a satisfiable at-limit fixture and a failing beyond-limit fixture with other dimensions below their limits. Serialized duplicate keys are checked after unescaping (`a` and `\u0061` collide). This profile is unrelated to F002 evidence/artifact limits; neither overrides the other. Narrower operation-specific field limits are allowed and documented; larger limits require a new reviewed bounds version and consumer compatibility fixtures.

## Canonical Values and Constructor Rules

| Primitive                 | Canonical exchange shape                                                                      | Invariants                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Signed exact integer      | ASCII canonical zero or signed nonzero-leading decimal digits                                                             | No `-0`, plus, whitespace, exponent, group separators or localized digits                                           |
| Nonnegative exact integer | ASCII canonical zero or nonzero-leading decimal digits                                                               | Field-specific maximum; no negative representation                                                                  |
| Decimal                   | `{ "coefficient": "123", "scale": 2 }`                                                        | Value 1.23; reduce trailing coefficient zeros with scale; unique zero is coefficient `0`, scale 0                   |
| Rational                  | `{ "numerator": "1", "denominator": "3" }`                                                    | Positive denominator, gcd=1, unique zero 0/1                                                                        |
| Ordinary money            | `{ "minorUnits": "123", "currency": "XTS", "exponent": 2, "profileVersion": "synthetic-v1" }` | Nonnegative integer units; uppercase 3-letter currency identity; explicit approved/synthetic profile interpretation |
| Money adjustment          | Same money fields plus distinct adjustment-type discriminator                                 | Signed minor units; cannot substitute for nonnegative ordinary money                                                |
| Seconds                   | `{ "seconds": "120" }`                                                                        | Nonnegative source seconds; no hours/minutes rounding                                                               |
| Date-only                 | `2028-02-29`                                                                                  | Exact Gregorian YYYY-MM-DD; leap-year/month/day validated without rollover                                          |
| Instant                   | `2026-10-18T10:30:00.000Z`                                                                    | Exact UTC milliseconds; seconds 00–59; no unqualified local time, leap seconds or extra precision                   |
| Revision                  | `"42"`                                                                                        | Nonnegative server-assigned counter; not a timestamp, schema version or opaque sync cursor                          |

Explicit constructors accept a restricted noncanonical exact representation only to normalize it, after checking supplied grammar/digit bounds: coefficient `120`, scale 2 becomes `12`, scale 1; ratio 2/6 becomes 1/3. Strict wire admission requires the canonical representation and reports `noncanonical` instead of silently rewriting intent. Constructors reject binary `number` amounts even if apparently integral. Small version/scale/exponent/count fields are validated safe integers, never authoritative money.

Source text is not implicitly normalized: localized `١٢٣٫٤٥`, ambiguous `1,234`, and surrounding whitespace must pass through a separately declared input-normalization layer before constructor admission. Reviewed adapter fixtures demonstrate that `١٢٣٫٤٥` and `123.45` produce the same exact value; this does not implement a product numeric editor or resolve ambiguous separators automatically. User names/Arabic combining sequences remain unchanged.

## Checked Arithmetic Surface

Provide constructors, equality/comparison, add/subtract, multiply/divide where unit meaning is defined, decimal↔rational conversion, exact decimal↔minor-unit conversion and nonnegative-second addition/subtraction. Do not multiply money by money or add seconds to amounts. Money addition/subtraction/comparison requires identical currency, exponent and profile version; ordinary-money subtraction below zero fails unless an explicit adjustment result was requested.

Every operation validates operands and sign contexts, preflights temporary digit growth, performs bounded work, normalizes and validates output. Result alternatives are `ok(value)` or a declared issue: `invalid_type`, `invalid_format`, `noncanonical`, `out_of_range`, `division_by_zero`, `incompatible_unit`, `non_representable`, `work_limit`. Public transport maps these through VALIDATION without exposing native exceptions.

Decimal alignment may use powers of ten only within declared source/intermediate bounds. Multiplication can form scale up to 36 temporarily, but normalized output must fit scale 18 and coefficient 38 digits or fail. Ratios cross-cancel before products, share the 1,024-step budget and validate the reduced output. A pair of admitted 38-digit ratios may need up to 77 temporary numerator digits; 128 is a hard scratch ceiling, not an output entitlement.

Rational→decimal reduces then factors the denominator into powers of 2 and 5. A remaining prime factor gives `non_representable`; a terminating result outside scale/coefficient bounds gives `out_of_range`. Decimal→minor units requires exact divisibility at the explicit exponent. BigInt integer division alone cannot establish exact conversion. No rounding-mode parameter, FX lookup, tax order, discount allocation, billing minimum or invoice-number allocator is part of F003.

## Required Independent Expectations

- 0.1+0.2 = exactly 0.3; 1/8 = exactly 0.125; 1/3 remains rational and finite-decimal conversion fails.
- 9,007,199,254,740,993+1 = exactly 9,007,199,254,740,994 without passing through `number`.
- 123 minor units with synthetic exponent 2 means 1.23; synthetic exponent 0/2/3 profiles retain their own exact interpretation.
- 59+61 source seconds = 120; maximum seconds+1 fails; no timer policy is inferred.
- Raw 39-digit reducible coefficients fail before normalization; maximum operand products can fail output bounds even if scratch space permits them.
- Gregorian 2028-02-29 passes, 2027-02-29 fails; date-only values survive timezone changes; precision excess and leap seconds fail explicitly.
- Every size/scalar/depth/node/issue/GCD-work limit has an independently authored boundary expectation. Diagnostics cannot echo attacker-supplied huge keys/content.
