import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("F013 T062: InviteMemberDialog implements accessible dialog semantics and bidi text isolation", () => {
  const dialogSrc = fs.readFileSync(
    path.resolve("app/renderer/components/workspaces/InviteMemberDialog.tsx"),
    "utf8",
  );

  // Dialog semantics
  assert.ok(dialogSrc.includes("DialogPopup"), "DialogPopup primitive used");
  assert.ok(dialogSrc.includes("DialogTitle"), "DialogTitle heading used");
  assert.ok(dialogSrc.includes("DialogDescription"), "DialogDescription used");
  assert.ok(
    dialogSrc.includes('role="alert"'),
    "Accessible role alert used for errors",
  );

  // Bidi text isolation for user-entered email and workspace labels
  assert.ok(
    dialogSrc.includes("<BdiText"),
    "BdiText used for bidirectional isolation",
  );

  // Keyboard navigation & focus management
  assert.ok(
    dialogSrc.includes("inputRef.current?.focus()"),
    "Initial focus managed",
  );
  assert.ok(
    dialogSrc.includes("disabled={busy}"),
    "Buttons disabled when busy to prevent accidental double-submit",
  );
});

test("F013 T062: InvitationStatusList implements accessible table and non-color semantic badges", () => {
  const listSrc = fs.readFileSync(
    path.resolve("app/renderer/components/workspaces/InvitationStatusList.tsx"),
    "utf8",
  );

  // Accessible region and table
  assert.ok(
    listSrc.includes('role="region"'),
    "Region role present for list section",
  );
  assert.ok(
    listSrc.includes('role="table"'),
    "Table role present for tabular structure",
  );
  assert.ok(listSrc.includes("aria-label="), "Accessible aria-label present");

  // Bidi text isolation for recipient labels
  assert.ok(
    listSrc.includes("<BdiText>{item.recipientLabel}</BdiText>"),
    "BdiText isolates recipient label",
  );

  // Non-color semantic status: text and icons both present
  assert.ok(listSrc.includes("Clock"), "Clock icon for pending/queued status");
  assert.ok(
    listSrc.includes("CheckCircle2"),
    "CheckCircle icon for accepted/delivered status",
  );
  assert.ok(
    listSrc.includes("AlertCircle"),
    "AlertCircle icon for failed status",
  );
  assert.ok(
    listSrc.includes("AlertTriangle"),
    "AlertTriangle icon for bounced status",
  );
  assert.ok(listSrc.includes("XCircle"), "XCircle icon for revoked status");

  // Focus preservation reference
  assert.ok(
    listSrc.includes("lastActiveElementRef"),
    "Focus tracked for restoration across refreshes",
  );
});

test("F013 T062: Action confirmation dialogs preserve consequence notices and accessibility", () => {
  const listSrc = fs.readFileSync(
    path.resolve("app/renderer/components/workspaces/InvitationStatusList.tsx"),
    "utf8",
  );

  // Resend notice and Revoke notice
  assert.ok(
    listSrc.includes("resendNotice"),
    "Resend notice displayed in confirmation",
  );
  assert.ok(
    listSrc.includes("revokeNotice"),
    "Revoke notice displayed in confirmation",
  );

  // Confirmation actions
  assert.ok(listSrc.includes("confirmRevoke"), "Explicit confirmRevoke button");
});
