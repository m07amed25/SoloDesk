// F013 Hosted Invitation Redemption Component
// Safe, identity-bound, single-use invitation review and acceptance.

import React, { useEffect, useState } from "react";
import { parseInvitationFragment } from "../../supabase/functions/_shared/invitation-delivery.ts";
import type {
  HostedInvitationReview,
  HostedAcceptInvitationResult,
} from "../../app/shared/invitation-contracts.ts";
import { en } from "../../packages/localization/src/shell/en.ts";
import { ar } from "../../packages/localization/src/shell/ar.ts";

export type RedemptionStatus =
  | "initializing"
  | "exchanging"
  | "sign_in_required"
  | "reviewing"
  | "review_ready"
  | "accepting"
  | "accepted"
  | "wrong_account"
  | "unavailable"
  | "error";

export interface InvitationRedemptionProps {
  apiBaseUrl?: string;
  authToken?: string;
  locale?: "en" | "ar";
  onSignInRequest?: () => void;
  onSwitchAccountRequest?: () => void;
}

export const InvitationRedemption: React.FC<InvitationRedemptionProps> = ({
  apiBaseUrl = "/api",
  authToken,
  locale = "en",
  onSignInRequest,
  onSwitchAccountRequest,
}) => {
  const strings = locale === "ar" ? ar : en;
  const isRtl = locale === "ar";

  const [status, setStatus] = useState<RedemptionStatus>("initializing");
  const [review, setReview] = useState<HostedInvitationReview | null>(null);
  const [acceptedResult, setAcceptedResult] =
    useState<HostedAcceptInvitationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial fragment extraction and immediate history scrubber
  useEffect(() => {
    async function initExchange() {
      const hash = window.location.hash;
      let hasFragment = false;

      if (hash && hash.length > 1) {
        const parsed = parseInvitationFragment(hash);
        // CRITICAL: Immediately purge fragment secrets from browser address bar & history
        if (window.history && window.history.replaceState) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }

        if (parsed.ok) {
          hasFragment = true;
          setStatus("exchanging");
          try {
            const res = await fetch(
              `${apiBaseUrl}/invitation-redemption/exchange`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  selector: parsed.selector,
                  secret: parsed.secret,
                }),
              },
            );

            const data = await res.json().catch(() => null);
            if (data?.state === "continue") {
              if (authToken) {
                await loadReview(authToken);
              } else {
                setStatus("sign_in_required");
              }
              return;
            }
          } catch (_err) {
            // Collapse exchange failures to safe neutral state
          }
          setStatus("unavailable");
          return;
        }
      }

      // If no valid fragment, but user is authenticated, attempt review from existing continuation cookie
      if (!hasFragment) {
        if (authToken) {
          await loadReview(authToken);
        } else {
          setStatus("unavailable");
        }
      }
    }

    initExchange();
  }, [apiBaseUrl]);

  // When authToken becomes available (e.g. after sign-in), load review
  useEffect(() => {
    if (authToken && status === "sign_in_required") {
      loadReview(authToken);
    }
  }, [authToken, status]);

  async function loadReview(token: string) {
    setStatus("reviewing");
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/invitation-redemption/review`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res
        .json()
        .catch(() => null)) as HostedInvitationReview | null;
      if (!data) {
        setStatus("unavailable");
        return;
      }

      if (data.state === "unavailable") {
        if (data.action === "switch_account") {
          setStatus("wrong_account");
        } else {
          setStatus("unavailable");
        }
        return;
      }

      if (data.state === "review") {
        setReview(data);
        setStatus("review_ready");
        return;
      }
    } catch (_err) {
      // Fallback
    }
    setStatus("unavailable");
  }

  async function handleAccept() {
    if (!review || review.state !== "review" || !authToken) return;

    setStatus("accepting");
    setErrorMessage(null);

    try {
      const operationId = crypto.randomUUID();
      const res = await fetch(`${apiBaseUrl}/invitation-redemption/accept`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          operationId,
          invitationRef: review.invitationRef,
          expectedRevision: review.revision,
          confirmed: true,
        }),
      });

      const data = (await res
        .json()
        .catch(() => null)) as HostedAcceptInvitationResult | null;
      if (data && data.ok) {
        setAcceptedResult(data);
        setStatus("accepted");
        return;
      }

      if (data && !data.ok) {
        if (data.action === "switch_account") {
          setStatus("wrong_account");
          return;
        }
        setStatus("unavailable");
        return;
      }
    } catch (_err) {
      // Fallback
    }
    setStatus("unavailable");
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans"
    >
      <main className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-bold tracking-tight">
            {strings["invitation.redemption.title"]}
          </h1>
        </header>

        {/* 1. Loading / Initializing */}
        {(status === "initializing" ||
          status === "exchanging" ||
          status === "reviewing") && (
          <div className="py-8 text-center text-slate-400 space-y-3">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="text-sm">
              {status === "reviewing"
                ? strings["invitation.submitting"]
                : strings["receipt.status.reconciling"]}
            </p>
          </div>
        )}

        {/* 2. Sign-In Required */}
        {status === "sign_in_required" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-300">
              {strings["invitation.consequenceNotice"]}
            </p>
            <button
              type="button"
              onClick={onSignInRequest}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {strings["invitation.redemption.confirm"]}
            </button>
          </div>
        )}

        {/* 3. Review Ready */}
        {status === "review_ready" && review && review.state === "review" && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-200">
                {strings["invitation.redemption.reviewHeading"]}
              </h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-700/40">
                <span className="text-slate-400">
                  {strings["invitation.workspaceLabel"]}
                </span>
                <span className="font-medium text-slate-200">
                  <bdi>{review.workspaceLabel}</bdi>
                </span>
              </div>

              {review.inviterLabel && (
                <div className="flex justify-between items-center py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">
                    {strings["invitation.roleLabel"]}
                  </span>
                  <span className="font-medium text-slate-200">
                    <bdi>{review.inviterLabel}</bdi>
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-slate-700/40">
                <span className="text-slate-400">
                  {strings["invitation.consequenceLabel"]}
                </span>
                <span className="font-medium text-indigo-300 text-xs text-right max-w-[200px]">
                  {strings[
                    review.consequenceLabelKey as keyof typeof strings
                  ] || strings["invitation.consequence.memberStandard"]}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">
                  {strings["invitation.expiryLabel"]}
                </span>
                <span className="text-xs text-slate-400">
                  {strings["invitation.expiry.sevenDays"]}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              {strings["invitation.consequenceNotice"]}
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleAccept}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {strings["invitation.redemption.confirm"]}
              </button>

              <button
                type="button"
                onClick={() => setStatus("unavailable")}
                className="w-full py-2.5 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors focus:outline-none"
              >
                {strings["invitation.cancel"]}
              </button>
            </div>
          </div>
        )}

        {/* 4. Accepting */}
        {status === "accepting" && (
          <div className="py-8 text-center text-slate-400 space-y-3">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="text-sm">
              {strings["invitation.redemption.accepting"]}
            </p>
          </div>
        )}

        {/* 5. Accepted Success */}
        {status === "accepted" && acceptedResult && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-emerald-400">
              {strings["invitation.redemption.accepted"]}
            </h2>
            <p className="text-sm text-slate-300">
              {strings["invitation.redemption.acceptedNotice"]}
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-block w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {strings["invitation.redemption.returnHome"]}
              </a>
            </div>
          </div>
        )}

        {/* 6. Wrong Account */}
        {status === "wrong_account" && (
          <div role="alert" className="space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-xl">
              !
            </div>
            <p className="text-sm text-slate-300">
              {strings["invitation.redemption.wrongAccountNotice"]}
            </p>
            <button
              type="button"
              onClick={onSwitchAccountRequest}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {strings["invitation.redemption.switchAccount"]}
            </button>
          </div>
        )}

        {/* 7. Unavailable */}
        {status === "unavailable" && (
          <div role="alert" className="space-y-4 text-center">
            <div className="w-12 h-12 bg-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl">
              ×
            </div>
            <p className="text-sm text-slate-300">
              {strings["invitation.redemption.unavailableNotice"]}
            </p>
            <a
              href="/"
              className="inline-block w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {strings["invitation.redemption.returnHome"]}
            </a>
          </div>
        )}
      </main>
    </div>
  );
};
