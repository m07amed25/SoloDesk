import type {
  PersistenceReasonCode,
  PersistenceRecoveryState,
  PersistenceStatusDto,
} from "../../shared/persistence-contracts.ts";

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
    message: ["The device vault cannot be used right now.", "لا يمكن استخدام خزنة الجهاز حالياً."],
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
