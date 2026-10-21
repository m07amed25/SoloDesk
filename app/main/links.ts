import { utf8Length } from "../../packages/contracts/src/bounds.ts";
import { parseAuthCallback } from "./identity/auth-callback.ts";
import { parseIdentityConfig, type IdentityConfig } from "./identity/config.ts";

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const RECORD = new RegExp(
  `^solodesk://open/record/(${UUID})\\?workspace=(${UUID})$`,
);
const HOME = "solodesk://open/home";

export type IdentityReturnIntent = Readonly<{
  kind: "identity_return";
  code?: string;
  error?: string;
  state: string;
  responseIssuer?: string;
  rawUrl: string;
}>;

export type LinkIntent =
  | Readonly<{ kind: "home" }>
  | Readonly<{ kind: "record"; recordId: string; workspaceId: string }>
  | IdentityReturnIntent;

export type LinkDecision = Readonly<{
  status: "accepted" | "denied" | "unavailable";
  route?: "home" | "record";
}>;

export function parseIdentityReturn(raw: unknown, config?: IdentityConfig): IdentityReturnIntent | null {
  if (typeof raw !== "string") return null;
  const grammarConfig = config ?? { ...parseIdentityConfig({ SOLODESK_TEST_MODE: "1" }), issuer: "" };
  const parsed = parseAuthCallback(raw, grammarConfig);
  if (parsed.type === "invalid") return null;
  return Object.freeze({
    kind: "identity_return",
    ...(parsed.type === "success" ? { code: parsed.code } : { error: parsed.error }),
    state: parsed.state,
    responseIssuer: parsed.responseIssuer,
    rawUrl: raw,
  });
}

export function parseLink(raw: unknown): LinkIntent | null {
  const identityReturn = parseIdentityReturn(raw);
  if (identityReturn) return identityReturn;

  if (
    typeof raw !== "string" ||
    utf8Length(raw) > 2048 ||
    [...raw].some((character) => {
      const code = character.charCodeAt(0);
      return code < 33 || code > 126 || character === "\\" || character === "%";
    })
  )
    return null;
  if (raw === HOME) return Object.freeze({ kind: "home" });
  const match = RECORD.exec(raw);
  if (!match) return null;
  return Object.freeze({
    kind: "record",
    recordId: match[1],
    workspaceId: match[2],
  });
}

export function initialLink(argv: readonly string[]): string | null {
  const links = argv.filter((argument) => argument.startsWith("solodesk://"));
  return links.length === 1 && utf8Length(links[0]) <= 2048 ? links[0] : null;
}

// This catalogue is deliberately empty until a later feature approves a named purpose.
export function externalDestination(purpose: string): null {
  void purpose;
  return null;
}

type RouterOptions = {
  knownProfile: (profileId: string) => boolean;
  syntheticRecord?: boolean;
  authorizeRecord?: (
    intent: Extract<LinkIntent, { kind: "record" }>,
    profileId: string,
  ) => Promise<boolean>;
  currentAuthority?: (
    intent: Extract<LinkIntent, { kind: "record" }>,
    profileId: string,
  ) => boolean;
};

export class LinkRouter {
  private readonly seen = new Set<string>();
  private readonly options: RouterOptions;

  constructor(options: RouterOptions) {
    this.options = options;
  }

  async decide(
    intent: LinkIntent | null,
    profileId: string,
    deliveryId?: string,
  ): Promise<LinkDecision> {
    if (!intent || !this.options.knownProfile(profileId))
      return { status: "denied" };
    if (deliveryId) {
      if (!/^[A-Za-z0-9-]{1,64}$/.test(deliveryId) || this.seen.has(deliveryId))
        return { status: "denied" };
      if (this.seen.size >= 32)
        this.seen.delete(this.seen.values().next().value!);
      this.seen.add(deliveryId);
    }
    if (intent.kind === "home") return { status: "accepted", route: "home" };
    if (intent.kind === "identity_return") return { status: "denied" };
    if (!this.options.syntheticRecord) return { status: "unavailable" };
    if (
      !this.options.authorizeRecord ||
      !this.options.currentAuthority ||
      !(await this.options.authorizeRecord(intent, profileId)) ||
      !this.options.currentAuthority(intent, profileId)
    )
      return { status: "denied" };
    return { status: "accepted", route: "record" };
  }
}
