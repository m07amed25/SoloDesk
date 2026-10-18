export const profiles = Object.freeze({
  default: "default",
  a: "synthetic-a",
  b: "synthetic-b",
});

export const trustedOrigin = "solodesk-app://ui";

export function request(
  payload = {},
  requestId = "11111111-1111-4111-8111-111111111111",
) {
  return {
    version: 1,
    requestId: { kind: "request", value: requestId },
    payload,
  };
}

export function authority(profileId = profiles.default, epoch = 1) {
  return Object.freeze({ profileId, epoch, allowed: true });
}
