export const values = Object.freeze({
  text: "اسم قانوني — Legal name",
  decimal: Object.freeze({ coefficient: "12345", scale: 2 }),
  ratio: Object.freeze({ numerator: "1", denominator: "3" }),
  money: Object.freeze({
    minorUnits: "123",
    currency: "XTS",
    exponent: 2,
    profileVersion: "synthetic-v1",
  }),
  seconds: Object.freeze({ seconds: "120" }),
  date: "2028-02-29",
  instant: "2026-10-18T01:02:03.000Z",
});
export const privateSentinel = "SYNTHETIC_PRIVATE_F003";
