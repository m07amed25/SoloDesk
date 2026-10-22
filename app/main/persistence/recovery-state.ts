import type {
  PersistenceReasonCode,
  PersistenceRecoveryState,
  PersistenceStatusDto,
} from "../../shared/persistence-contracts.ts";
import type {
  IdentityAction,
  IdentityLifecycle,
  SessionStatus,
} from "../../shared/identity-contracts.ts";
import type {
  SafeReasonCode,
  SafeActionCode,
} from "../../shared/workspace-contracts.ts";

export type IdentityRecoveryState = Readonly<{
  lifecycle: IdentityLifecycle;
  sessionStatus: SessionStatus;
  messageKey: string;
  actionKey: string;
  nextActions: readonly IdentityAction[];
}>;

export function identityRecoveryState(error: unknown): IdentityRecoveryState {
  const reason = error instanceof Error ? error.message : String(error);
  if (
    [
      "vault_locked",
      "key_missing",
      "unprotected_backend",
      "protection_denied",
    ].includes(reason)
  ) {
    return Object.freeze({
      lifecycle: "protection_unavailable",
      sessionStatus: "none",
      messageKey: "shell.identity.recovery.unlockProtection",
      actionKey: "shell.identity.action.unlockProtection",
      nextActions: Object.freeze(["unlock_protection"] as const),
    });
  }
  if (reason.includes("unsupported")) {
    return Object.freeze({
      lifecycle: "recovery_required",
      sessionStatus: "none",
      messageKey: "shell.identity.recovery.upgrade",
      actionKey: "shell.identity.action.upgrade",
      nextActions: Object.freeze(["upgrade"] as const),
    });
  }
  if (reason === "session_rejected" || reason === "session_invalidated") {
    return Object.freeze({
      lifecycle: "sign_in_required",
      sessionStatus: "rejected",
      messageKey: "shell.identity.recovery.signInAgain",
      actionKey: "shell.identity.action.signIn",
      nextActions: Object.freeze(["sign_in_again"] as const),
    });
  }
  if (reason === "partial_enrollment" || reason === "outcome_unknown") {
    return Object.freeze({
      lifecycle: "recovery_required",
      sessionStatus: "current",
      messageKey: "shell.identity.recovery.reconcile",
      actionKey: "shell.identity.action.reconcile",
      nextActions: Object.freeze(["reconcile"] as const),
    });
  }
  return Object.freeze({
    lifecycle: "recovery_required",
    sessionStatus: "none",
    messageKey: "shell.identity.recovery.contactSupport",
    actionKey: "shell.identity.action.contactSupport",
    nextActions: Object.freeze(["contact_support"] as const),
  });
}

const messages: Record<
  PersistenceReasonCode,
  {
    title: [string, string];
    message: [string, string];
    guidance: [string, string];
  }
> = {
  vault_locked: {
    title: ["Protected storage is unavailable", "التخزين المحمي غير متاح"],
    message: [
      "The device vault cannot be used right now.",
      "لا يمكن استخدام خزنة الجهاز حالياً.",
    ],
    guidance: [
      "Unlock or configure a protected device vault, then try again.",
      "افتح خزنة الجهاز المحمية أو هيئها ثم حاول مجدداً.",
    ],
  },
  key_missing: {
    title: ["Storage key is missing", "مفتاح التخزين مفقود"],
    message: [
      "The encrypted store cannot be opened without its key.",
      "لا يمكن فتح المخزن المشفر دون مفتاحه.",
    ],
    guidance: [
      "Keep the local files. Restore the device key or a verified backup.",
      "احتفظ بالملفات المحلية. استعد مفتاح الجهاز أو نسخة احتياطية موثوقة.",
    ],
  },
  integrity_failed: {
    title: ["Storage integrity check failed", "فشل فحص سلامة التخزين"],
    message: [
      "The encrypted store could not be verified.",
      "تعذر التحقق من المخزن المشفر.",
    ],
    guidance: [
      "Keep the local files and seek recovery help before retrying.",
      "احتفظ بالملفات المحلية واطلب مساعدة الاستعادة قبل المحاولة مجدداً.",
    ],
  },
  disk_full: {
    title: ["More free space is required", "يلزم توفير مساحة إضافية"],
    message: [
      "A safe migration needs more free disk space.",
      "تحتاج الترقية الآمنة إلى مساحة تخزين إضافية.",
    ],
    guidance: [
      "Free space on this device, then retry. Keep the local files.",
      "وفّر مساحة على هذا الجهاز ثم أعد المحاولة. احتفظ بالملفات المحلية.",
    ],
  },
  interrupted_migration: {
    title: ["Migration was interrupted", "توقفت ترقية البيانات"],
    message: [
      "The previous schema change did not finish.",
      "لم يكتمل تغيير بنية البيانات السابق.",
    ],
    guidance: [
      "The verified prior snapshot was restored. Review local work before retrying.",
      "استعيدت النسخة السابقة المتحقق منها. راجع العمل المحلي قبل إعادة المحاولة.",
    ],
  },
  unsupported_future_version: {
    title: ["A newer app version is required", "يلزم إصدار أحدث من التطبيق"],
    message: [
      "This store uses a newer schema.",
      "يستخدم هذا المخزن بنية بيانات أحدث.",
    ],
    guidance: [
      "Update SoloDesk before opening this workspace.",
      "حدّث SoloDesk قبل فتح مساحة العمل هذه.",
    ],
  },
  io_error: {
    title: ["Storage could not be read", "تعذرت قراءة التخزين"],
    message: [
      "The device reported a storage error.",
      "أبلغ الجهاز عن خطأ في التخزين.",
    ],
    guidance: [
      "Check the device and permissions. Keep the local files, then retry.",
      "تحقق من الجهاز والأذونات. احتفظ بالملفات المحلية ثم أعد المحاولة.",
    ],
  },
};

export function classifyStorageError(error: unknown): PersistenceReasonCode {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const name = error instanceof Error ? error.message : "";
  if (
    name === "vault_locked" ||
    name === "unprotected_backend" ||
    name === "protection_denied"
  )
    return "vault_locked";
  if (name === "key_missing") return "key_missing";
  if (name === "unsupported_future_version")
    return "unsupported_future_version";
  if (name === "interrupted_migration") return "interrupted_migration";
  if (name === "disk_full" || code === "ENOSPC" || code === "SQLITE_FULL")
    return "disk_full";
  if (
    name === "integrity_failed" ||
    code.includes("CORRUPT") ||
    code.includes("NOTADB")
  )
    return "integrity_failed";
  return "io_error";
}

export function recoveryStatus(
  workspaceId: string,
  reasonCode: PersistenceReasonCode,
  extra: Partial<PersistenceRecoveryState> = {},
): PersistenceStatusDto {
  const value = messages[reasonCode];
  const localized = ([en, ar]: [string, string]) => ({ en, ar });
  return {
    workspaceId,
    status: "recovery_required",
    recoveryDetails: {
      workspaceId,
      reasonCode,
      isRecoverable: reasonCode !== "integrity_failed",
      // Inaccessible storage cannot prove intact unsynced records.
      unsyncedWorkRetained: false,
      localizedTitle: localized(value.title),
      localizedMessage: localized(value.message),
      localizedGuidance: localized(value.guidance),
      permittedActions:
        reasonCode === "unsupported_future_version"
          ? ["quit"]
          : ["retry", "quit"],
      ...extra,
    },
  };
}

export type WorkspaceRecoveryOutcome = Readonly<{
  reasonCode: SafeReasonCode;
  actionCode: SafeActionCode;
  messageKey: string;
  actionKey: string;
  nextActions: readonly SafeActionCode[];
}>;

export function workspaceRecoveryState(
  outcome: unknown,
): WorkspaceRecoveryOutcome {
  const reason = outcome instanceof Error ? outcome.message : String(outcome);
  if (
    reason === "uninitialized" ||
    reason === "local_partition_missing" ||
    reason === "missing"
  ) {
    return Object.freeze({
      reasonCode: "local_partition_missing",
      actionCode: "choose_another_workspace",
      messageKey: "shell.workspace.recovery.localPartitionMissing",
      actionKey: "shell.workspace.action.chooseAnotherWorkspace",
      nextActions: Object.freeze(["choose_another_workspace"] as const),
    });
  }
  if (
    reason === "vault_locked" ||
    reason === "protection_locked" ||
    reason === "protection_denied" ||
    reason === "unprotected_backend"
  ) {
    return Object.freeze({
      reasonCode: "protection_locked",
      actionCode: "unlock",
      messageKey: "shell.workspace.recovery.protectionLocked",
      actionKey: "shell.workspace.action.unlock",
      nextActions: Object.freeze([
        "unlock",
        "choose_another_workspace",
      ] as const),
    });
  }
  if (
    reason === "integrity_failed" ||
    reason === "local_partition_unreadable" ||
    reason === "corrupt" ||
    reason === "wrong_binding"
  ) {
    return Object.freeze({
      reasonCode: "local_partition_unreadable",
      actionCode: "approved_recovery",
      messageKey: "shell.workspace.recovery.localPartitionUnreadable",
      actionKey: "shell.workspace.action.approved_recovery",
      nextActions: Object.freeze([
        "approved_recovery",
        "choose_another_workspace",
      ] as const),
    });
  }
  if (
    reason === "unsupported_future_version" ||
    reason === "upgrade_required"
  ) {
    return Object.freeze({
      reasonCode: "upgrade_required",
      actionCode: "upgrade",
      messageKey: "shell.workspace.recovery.upgradeRequired",
      actionKey: "shell.workspace.action.upgrade",
      nextActions: Object.freeze(["upgrade"] as const),
    });
  }
  if (reason === "online_required" || reason === "offline") {
    return Object.freeze({
      reasonCode: "online_required",
      actionCode: "reconnect",
      messageKey: "shell.workspace.recovery.onlineRequired",
      actionKey: "shell.workspace.action.reconnect",
      nextActions: Object.freeze([
        "reconnect",
        "choose_another_workspace",
      ] as const),
    });
  }
  if (
    reason === "workspace_unavailable" ||
    reason === "revoked" ||
    reason === "closed"
  ) {
    return Object.freeze({
      reasonCode: "workspace_unavailable",
      actionCode: "choose_another_workspace",
      messageKey: "shell.workspace.recovery.workspaceUnavailable",
      actionKey: "shell.workspace.action.chooseAnotherWorkspace",
      nextActions: Object.freeze([
        "choose_another_workspace",
        "refresh",
      ] as const),
    });
  }
  return Object.freeze({
    reasonCode: "recovery_required",
    actionCode: "retry_or_contact_support",
    messageKey: "shell.workspace.recovery.recoveryRequired",
    actionKey: "shell.workspace.action.retry_or_contact_support",
    nextActions: Object.freeze(["retry_or_contact_support"] as const),
  });
}
