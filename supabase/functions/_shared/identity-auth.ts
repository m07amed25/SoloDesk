export type VerifiedIdentityContext = Readonly<{
  issuerId: string;
  subjectId: string;
  sessionObservedAt: string;
}>;

export type IdentityAuthConfig = Readonly<{
  issuer: string;
  audience: string;
  fetchJwks?: typeof fetch;
  now?: () => number;
}>;

function decodePart(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodePart(value)));
  } catch {
    return null;
  }
}

export async function validateIdentityAccount(
  request: Request,
  config: IdentityAuthConfig,
): Promise<VerifiedIdentityContext | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (
    !header ||
    !claims ||
    (header.alg !== "RS256" && header.alg !== "ES256") ||
    typeof header.kid !== "string"
  ) return null;

  const issuer = new URL(config.issuer).toString().replace(/\/$/, "");
  if (claims.iss !== issuer || typeof claims.sub !== "string" || claims.sub.length === 0) return null;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(config.audience)) return null;
  if (claims.azp !== undefined && claims.azp !== config.audience) return null;
  const now = Math.floor((config.now?.() ?? Date.now()) / 1000);
  if (!Number.isSafeInteger(claims.exp) || Number(claims.exp) <= now) return null;
  if (!Number.isSafeInteger(claims.iat) || Number(claims.iat) > now + 60 || Number(claims.iat) >= Number(claims.exp)) return null;
  if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || Number(claims.nbf) > now + 60)) return null;

  let response: Response;
  try {
    response = await (config.fetchJwks ?? fetch)(`${issuer}/.well-known/jwks.json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let document: { keys?: (JsonWebKey & { kid?: string })[] };
  try { document = await response.json(); } catch { return null; }
  if (!document || !Array.isArray(document.keys)) return null;
  const expectedKeyType = header.alg === "ES256" ? "EC" : "RSA";
  const jwk = document.keys?.find(
    (candidate) =>
      candidate.kid === header.kid &&
      candidate.kty === expectedKeyType &&
      (!candidate.alg || candidate.alg === header.alg),
  );
  if (!jwk) return null;
  try {
    const algorithm = header.alg === "ES256"
      ? { name: "ECDSA", namedCurve: "P-256" }
      : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      algorithm,
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      header.alg === "ES256"
        ? { name: "ECDSA", hash: "SHA-256" }
        : "RSASSA-PKCS1-v1_5",
      key,
      decodePart(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;
  } catch {
    return null;
  }
  return Object.freeze({
    issuerId: issuer,
    subjectId: claims.sub,
    sessionObservedAt: new Date(now * 1000).toISOString(),
  });
}

