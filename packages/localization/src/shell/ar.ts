import type { TranslationDictionary } from "./types.ts";

export const ar: TranslationDictionary = {
  // Application
  "app.title": "سولو ديسك",
  "skip.content": "التخطي إلى المحتوى الرئيسي",

  // Navigation
  "nav.overview": "نظرة عامة",
  "nav.my_work": "أعمالي",
  "nav.projects": "المشاريع",
  "nav.clients": "العملاء",
  "nav.time": "الوقت",
  "nav.finance": "المالية",
  "nav.reports": "التقارير",
  "nav.knowledge": "المعرفة",
  "nav.settings": "الإعدادات",

  // Sidebar
  "sidebar.expand": "توسيع الشريط الجانبي",
  "sidebar.collapse": "طي الشريط الجانبي",
  "sidebar.main_nav": "التنقل الرئيسي",

  // Search & Command Palette
  "search.placeholder": "ابحث أو اكتب أمرًا...",
  "search.trigger": "بحث",
  "search.shortcut": "Mod+K",
  "search.no_results": 'لم يتم العثور على نتائج لـ "{query}"',
  "search.category.navigation": "التنقل",
  "search.category.actions": "الإجراءات",
  "search.category.preferences": "التفضيلات",
  "search.close": "إغلاق البحث",
  "search.clear": "مسح البحث",
  "search.available_commands": "الأوامر المتاحة",

  // Theme
  "theme.light": "فاتح",
  "theme.dark": "داكن",
  "theme.system": "النظام",
  "theme.toggle": "تبديل المظهر",
  "theme.switch_to": "تبديل المظهر: {mode}",
  "theme.label": "المظهر",

  // Language
  "language.en": "English",
  "language.ar": "العربية",
  "language.toggle": "التبديل إلى الإنجليزية",
  "language.label": "اللغة",

  // Utilities & Placeholders
  "placeholder.phase_badge": "المرحلة المستهدفة: {phase}",
  "placeholder.workspaces.title": "مساحات العمل",
  "placeholder.workspaces.status": "مساحة عمل شخصية",
  "placeholder.workspaces.description":
    "سيتم تفعيل مبدّل مساحات العمل وإدارة المنظمات في المرحلة P01 (F012).",

  "placeholder.timer.title": "المؤقت",
  "placeholder.timer.status": "00:00:00 (متوقف)",
  "placeholder.timer.description":
    "سيتم تفعيل تتبع الوقت على سطح المكتب والتخصيص بلا اتصال في المرحلة P04 (F036).",

  "placeholder.sync.title": "حالة المزامنة",
  "placeholder.sync.status": "سطح المكتب المحلي (بلا اتصال)",
  "placeholder.sync.description":
    "سيتم تفعيل محرك المزامنة السحابية ومطابقة التغييرات بلا اتصال في المرحلة P01 (F017).",

  "placeholder.notifications.title": "الإشعارات",
  "placeholder.notifications.status": "لا توجد إشعارات",
  "placeholder.notifications.description":
    "سيتم تفعيل إشعارات سطح المكتب ومركز الإجراءات في المرحلة P01 (F022).",

  "placeholder.unbuilt_module.title": "وحدة {module}",
  "placeholder.unbuilt_module.notice":
    "هذه الميزة مجدولة للتسليم في مرحلة قادمة. لا يتم عرض أي بيانات تجريبية أو إجراءات غير مدعومة.",

  // Settings
  "settings.title": "إعدادات التطبيق",
  "settings.description":
    "إدارة تفضيلات العرض المحلية وعرض معلومات بيئة سطح المكتب.",
  "settings.language.title": "لغة الواجهة",
  "settings.language.description":
    "اختر بين الإنجليزية والعربية. يتم تحديث اتجاه العرض RTL والخطوط فورًا.",
  "settings.theme.title": "المظهر",
  "settings.theme.description":
    "اختر المظهر الفاتح أو الداكن أو اتباع مظهر نظام التشغيل.",
  "settings.environment.title": "بيئة سطح المكتب",
  "settings.environment.platform": "نظام التشغيل",
  "settings.environment.version": "الإصدار",

  // Window Controls
  "window.minimize": "تصغير",
  "window.maximize": "تكبير",
  "window.restore": "استعادة",
  "window.close": "إغلاق",

  // Breadcrumbs
  "breadcrumb.home": "الرئيسية",

  // حالات حماية البيانات المحلية
  "protection.title": "الحماية المحلية غير متاحة",
  "protection.check_again": "التحقق مجددًا",
  "protection.vault_locked":
    "افتح مخزن مفاتيح الجهاز ثم تحقّق مجددًا. تبقى بياناتك المحمية مقفلة.",
  "protection.key_missing":
    "مفتاح الجهاز الخاص بهذه البيانات المحلية مفقود. تحقّق من جهاز ما زال يحتفظ به أو من نسخة احتياطية محمية إن وُجدت. إعادة تعيين كلمة مرور الحساب لا تفك تشفير البيانات المحلية غير المتزامنة.",
  "protection.protection_denied":
    "رفض الجهاز الوصول إلى المفتاح. تحقّق من صلاحيات النظام ثم أعد المحاولة أو تواصل مع الدعم.",
  "protection.unprotected_backend":
    "مخزن المفاتيح في هذا الجهاز لا يوفّر حماية مناسبة. لا يمكن فتح البيانات المحلية المحمية أو حفظها حتى يتوفر مخزن مفاتيح محمي.",
  "protection.integrity_failed":
    "تعذّر التحقق من سلامة البيانات المحمية. لا تستبدلها بنسخة فارغة؛ تواصل مع الدعم واذكر معرّف التشخيص.",
  "protection.interrupted_rotation":
    "توقّف تغيير المفتاح قبل اكتماله. يجب التحقق من النسخ المحمية قبل متابعة العمل؛ تواصل مع الدعم.",
  "protection.unsupported_format":
    "هذا الإصدار لا يدعم صيغة البيانات المحمية. حدّث التطبيق أو تواصل مع الدعم؛ لم تُستبدل البيانات الحالية.",

  // تنبيهات السعة السحابية والوضع المقيّد (F008)
  "quota.warning_70":
    "وصل استهلاك مساحة التخزين إلى 70٪. يُنصح بأرشفة الملفات غير المستخدمة.",
  "quota.warning_85":
    "وصل استهلاك مساحة التخزين إلى 85٪. يرجى إخلاء مساحة لتجنب تعليق الحفظ.",
  "quota.critical_95":
    "تحذير حرج: استهلاك التخزين بلغ 95٪. أوشكت المساحة على النفاد.",
  "quota.exhausted_100":
    "تم استنفاد سعة التخزين السحابية (100٪). تم إيقاف الحفظ الجديد مؤقتًا.",
  "quota.provider_degraded":
    "الخدمة السحابية متوقفة أو تعمل بشكل مقيّد مؤقتًا. يتم حفظ التغييرات محليًا بأمان.",
  "quota.dismiss": "إغلاق التنبيه",

  // إيصالات الأوامر المعتمدة والتدقيق (F009)
  "receipt.status.committed": "تم اعتماد التغيير رسميًا",
  "receipt.status.job_accepted": "تم قبول العملية للمعالجة",
  "receipt.status.conflict": "تم اكتشاف تعارض في النسخة",
  "receipt.status.rejected": "تم رفض الأمر",
  "receipt.status.proven_not_applied": "تم إثبات عدم تطبيق العملية",
  "receipt.status.reconciling": "جارٍ التحقق من حالة العملية...",
  "receipt.announcement.committed":
    "اكتمل تنفيذ الأمر بنجاح. معرّف الإيصال: {receiptId}",
  "receipt.announcement.conflict": "تعذر تنفيذ الأمر بسبب تعارض في النسخة.",
  "receipt.announcement.rejected": "تم رفض الأمر من قِبل الخادم.",

  // استعادة الهوية (نص محلي آمن، دون نسخ رسائل المزوّد)
  "shell.identity.action.retry": "إعادة المحاولة",
  "shell.identity.action.cancel": "إلغاء",
  "shell.identity.action.unlockProtection": "فتح الحماية",
  "shell.identity.action.signIn": "تسجيل الدخول مجددًا",
  "shell.identity.action.chooseIsolatedProfile": "اختيار ملف شخصي معزول",
  "shell.identity.action.reconcile": "التحقق من حالة التسجيل",
  "shell.identity.action.upgrade": "تحديث سولو ديسك",
  "shell.identity.action.contactSupport": "التواصل مع الدعم",
  "shell.identity.recovery.unlockProtection":
    "افتح تخزين الجهاز المحمي قبل المتابعة. لم تُستبدل البيانات المحلية الحالية.",
  "shell.identity.recovery.signInAgain":
    "لم تعد الجلسة الحالية صالحة. سجّل الدخول مجددًا للمتابعة.",
  "shell.identity.recovery.reconcile":
    "قد تكون عملية التسجيل ما زالت قيد التنفيذ. تحقّق من حالتها المعتمدة قبل بدء تسجيل جديد.",
  "shell.identity.recovery.upgrade":
    "تحتاج صيغة الهوية المحمية هذه إلى إصدار أحدث من سولو ديسك. لم تُستبدل البيانات الحالية.",
  "shell.identity.recovery.contactSupport":
    "تعذّر التحقق من بيانات الهوية المحمية. احتفظ بالملفات الحالية وتواصل مع الدعم.",

  // أمان الحساب والمصادقة متعددة العوامل (F011)
  "identity.security.title": "أمان الحساب",
  "identity.security.policy.optional": "المصادقة الثنائية اختيارية لحسابك.",
  "identity.security.policy.required":
    "المصادقة الثنائية مطلوبة وفقاً لسياسة مؤسستك.",
  "identity.security.status.not_configured":
    "لم يتم إعداد عوامل مصادقة إضافية.",
  "identity.security.status.recovery_codes_pending":
    "تم التحقق من العامل الإضافي. يرجى حفظ وتأكيد رموز الاسترداد الخاصة بك.",
  "identity.security.status.ready": "المصادقة الثنائية مفعلة وجاهزة للاستخدام.",
  "identity.security.announcement.browser_opened":
    "تم فتح نافذة متصفح آمنة لإكمال الإعداد.",
  "identity.security.action.enroll_factor": "إعداد تطبيق المصادقة",
  "identity.security.action.acknowledge_recovery_codes":
    "لقد حفظت رموز الاسترداد هذه بأمان",
  "identity.security.action.cancel": "إلغاء الإعداد",
  "identity.security.recovery_codes.confined_warning":
    "تُعرض رموز الاسترداد لمرة واحدة فقط في المتصفح الآمن. احفظها بأمان قبل التأكيد.",
  "identity.security.error.verification_failed":
    "فشلت عملية التحقق. يرجى مراجعة بيانات الاعتماد أو المحاولة مجدداً.",
  "identity.security.status.challenge_required":
    "مطلوب تحقق إضافي لمتابعة العملية.",
  "identity.security.status.challenge_waiting":
    "في انتظار استكمال التحقق في نافذة المتصفح الآمنة...",
  "identity.security.status.challenge_expired":
    "انتهت صلاحية طلب التحقق. يرجى المحاولة مجدداً.",
  "identity.security.status.rate_limited":
    "محاولات فاشلة كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى أو استخدام استرداد الحساب.",
  "identity.security.action.open_challenge": "التحقق من الهوية",
  "identity.security.action.retry": "إعادة المحاولة",
  "identity.security.action.recover": "استرداد الحساب",
  "identity.security.action.sign_in_again": "تسجيل الدخول مجدداً",
  "identity.security.status.recovery_requested":
    "إذا كان هناك حساب مرتبط بهذا المعرّف، فقد تم إرسال تعليمات الاسترداد.",
  "identity.security.status.factor_reset_required":
    "تم استرداد الوصول إلى الحساب. تم إعادة ضبط تطبيق المصادقة السابق. يرجى إعداد تطبيق مصادقة جديد.",
  "identity.security.status.local_unlock_required":
    "تم التحقق من هوية الحساب. تتطلب بيانات مساحة العمل المشفرة محلياً إلغاء قفل الجهاز.",
  "identity.security.status.workspace_revalidation":
    "تم استرداد الجلسة السحابية. يجب إعادة التحقق من صلاحيات مساحة العمل.",
  "identity.security.action.unlock_local": "إلغاء قفل البيانات المحلية",
  "identity.security.action.revalidate_workspace": "إعادة التحقق من الوصول",
  "identity.security.status.reauth_required":
    "إعادة المصادقة مطلوبة. يرجى تأكيد هويتك لإكمال هذا التغيير الأمني.",
  "identity.security.status.stale_action":
    "لم يعد هذا الطلب الأمني صالحاً بسبب وجود تحديث أحدث للحساب.",
  "identity.security.status.session_impact":
    "سيؤدي إكمال هذا التغيير الأمني إلى تسجيل الخروج من جميع الجلسات النشطة الأخرى.",
  "identity.security.action.reauthenticate": "إعادة المصادقة",
  "identity.security.action.confirm_change": "تأكيد التغيير",
};
