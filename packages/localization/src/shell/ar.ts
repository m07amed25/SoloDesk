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
  "sidebar.open_menu": "فتح القائمة",
  "sidebar.close_menu": "إغلاق القائمة",

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
  "theme.preset.title": "النمط البصري للمظهر",
  "theme.preset.description": "اختر النمط البصري ومجموعة ألوان التمييز.",
  "theme.preset.modern": "حديث بسيط",
  "theme.preset.amber": "عنبري أحادي الخط",
  "theme.preset.graphite": "غرافيت",
  "theme.preset.high_contrast": "تباين عالٍ",
  "theme.preset.solar": "شمسي",
  "theme.preset.chakra": "شاكرا صناعي",
  "theme.preset.cobalt": "كوبالت",
  "theme.preset.amber_outfit": "عنبري آوتفت",
  "theme.preset.switch_to": "تغيير النمط البصري: {style}",

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
  "settings.account.title": "الحساب والجهاز",
  "settings.account.description":
    "إدارة حسابك المعتمد وتسجيل الجهاز الموثوق وخزنة التشفير.",
  "settings.account.profileName": "الاسم المعروض",
  "settings.account.identifier": "معرّف الحساب",
  "settings.account.device": "الجهاز الموثوق",
  "settings.account.protection": "حماية الجهاز",
  "settings.account.status": "حالة الحساب",
  "settings.account.notEnrolled": "لم يُسجّل بعد",
  "settings.account.noName": "غير محدد",

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

  // المصادقة
  "auth.title": "تسجيل الدخول إلى سولو ديسك",
  "auth.description": "سجّل الدخول قبل إنشاء مساحة عمل سحابية أو فتحها.",
  "auth.menuDescription": "تابع إلى مساحات عملك باستخدام حساب سولو ديسك.",
  "auth.google": "المتابعة باستخدام Google",
  "auth.or": "أو",
  "auth.signIn": "تسجيل الدخول",
  "auth.signUp": "إنشاء حساب",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.working": "يرجى الانتظار…",
  "auth.cancel": "إلغاء",
  "auth.error.unavailable": "خدمة المصادقة غير متاحة مؤقتًا.",
  "auth.enrollment.title": "الوثوق بهذا الجهاز",
  "auth.enrollment.description":
    "سجّل هذا التثبيت المحمي قبل الوصول إلى مساحات العمل.",
  "auth.enrollment.deviceLabel": "اسم الجهاز",
  "auth.enrollment.confirm": "الوثوق والمتابعة",
  "auth.account": "الحساب",
  "auth.profile": "الملف الشخصي",
  "auth.signOut": "تسجيل الخروج",
  "auth.signingOut": "جارٍ تسجيل الخروج…",
  "auth.notSignedIn": "غير مسجل الدخول",
  "auth.signedInAs": "مسجل الدخول باسم",
  "auth.deviceEnrolled": "جهاز موثوق",
  "auth.deviceNotEnrolled": "قيد التسجيل",
  "auth.protectionReady": "خزنة الحماية نشطة",
  "auth.protectionBlocked": "الخزنة مقفلة",
  "auth.sessionActive": "جلسة نشطة",
  "auth.manageAccount": "إعدادات الحساب",
  "auth.enrollDevicePrompt": "إكمال تسجيل الجهاز",
  "shell.identity.signingIn": "جارٍ تسجيل الدخول بأمان…",
  "shell.identity.invalidCredentials":
    "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو لا يمكن لهذا الحساب تسجيل الدخول.",
  "shell.identity.providerUnavailable":
    "خدمة المصادقة غير متاحة. حاول مرة أخرى.",
  "shell.identity.checkEmail":
    "تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم ارجع وسجّل الدخول.",

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

  // Workspace Management (F012)
  "workspace.title": "مساحات العمل",
  "workspace.create.dialogTitle": "إنشاء مساحة عمل",
  "workspace.create.displayNameLabel": "اسم مساحة العمل",
  "workspace.create.displayNamePlaceholder": "مثال: استوديو الإبداع",
  "workspace.create.legalNameLabel":
    "الاسم القانوني / التجاري للمنشأة (اختياري)",
  "workspace.create.legalNamePlaceholder": "الاسم القانوني الاختياري",
  "workspace.create.tradeNameLabel": "الاسم التجاري (اختياري)",
  "workspace.create.tradeNamePlaceholder": "الاسم التجاري الاختياري",
  "workspace.create.timezoneLabel": "المنطقة الزمنية الافتراضية",
  "workspace.create.currencyLabel": "العملة الافتراضية",
  "workspace.create.localeLabel": "اللغة الافتراضية لمساحة العمل",
  "workspace.create.submit": "إنشاء مساحة العمل",
  "workspace.create.cancel": "إلغاء",
  "workspace.create.creating": "جارٍ إنشاء مساحة العمل...",
  "workspace.create.incompleteReadinessNotice":
    "ستبدأ مساحة العمل هذه بحالة إعداد غير مكتمل. يمكن تحديث الإعدادات لاحقاً.",
  "workspace.create.error.nameRequired": "اسم مساحة العمل مطلوب.",
  "workspace.create.error.nameTooLong": "يتجاوز اسم مساحة العمل 120 حرفاً.",
  "workspace.create.error.invalidCurrency":
    "العملة المحددة غير مدعومة بالسياسة الحالية.",
  "workspace.create.error.policyDisabled":
    "إنشاء مساحات العمل غير متاح حالياً.",
  "workspace.readiness.setupIncomplete": "الإعداد غير مكتمل",
  "workspace.readiness.ready": "جاهز",
  "workspace.switch.title": "تبديل مساحة العمل",
  "workspace.switch.current": "مساحة العمل الحالية",
  "workspace.switch.switching": "جارٍ تبديل مساحة العمل...",
  "workspace.switch.pendingChangesNotice":
    "لديك تغييرات غير محفوظة في مساحة العمل الحالية.",
  "workspace.switch.saveAndSwitch": "حفظ وتبديل",
  "workspace.switch.discardAndSwitch": "تجاهل وتبديل",
  "workspace.switch.stay": "البقاء في مساحة العمل الحالية",
  "shell.workspace.recovery.localPartitionMissing":
    "قسم مساحة العمل المشفر محلياً مفقود أو مقفل. افتح القفل أو اختر مساحة عمل أخرى.",
  "shell.workspace.recovery.protectionLocked":
    "التخزين المحمي للجهاز مقفل. افتح خزنة الجهاز للوصول إلى مساحة العمل هذه.",
  "shell.workspace.recovery.localPartitionUnreadable":
    "تعذر التحقق من بيانات مساحة العمل المحلية. يلزم إجراء استعادة آمنة مع الحفاظ على الملفات الأصلية.",
  "shell.workspace.recovery.upgradeRequired":
    "يلزم إصدار أحدث من SoloDesk لفتح مساحة العمل هذه.",
  "shell.workspace.recovery.workspaceUnavailable":
    "مساحة العمل المحددة غير متاحة أو تم إلغاء الوصول إليها.",
  "shell.workspace.recovery.recoveryRequired":
    "يلزم استعادة التخزين قبل فتح مساحة العمل هذه.",
  "shell.workspace.recovery.onlineRequired":
    "الاتصال بالإنترنت مطلوب للتحقق من العضوية في مساحة العمل.",
  "shell.workspace.recovery.serviceUnavailable":
    "خدمة مساحات العمل غير متاحة مؤقتاً. يُرجى المحاولة مرة أخرى.",
  "shell.workspace.recovery.outcomeUnknown":
    "نتيجة إنشاء مساحة العمل غير معروفة. يُرجى التحقق من الحالة.",
  "shell.workspace.action.chooseAnotherWorkspace": "اختيار مساحة عمل أخرى",
  "shell.workspace.action.reconnect": "إعادة الاتصال",
  "shell.workspace.action.retry": "إعادة المحاولة",
  "shell.workspace.action.reconcileCreation": "التحقق من حالة الإنشاء",
  "shell.workspace.action.sign_in_again": "تسجيل الدخول مجدداً",
  "shell.workspace.action.reenroll_device": "إعادة تسجيل الجهاز",
  "shell.workspace.action.refresh_options": "تحديث الخيارات",
  "shell.workspace.action.refresh": "تحديث",
  "shell.workspace.action.unlock": "إلغاء القفل",
  "shell.workspace.action.approved_recovery": "استعادة آمنة",
  "shell.workspace.action.retry_or_contact_support":
    "إعادة المحاولة أو التواصل مع الدعم",
  "shell.workspace.action.correct_input": "تصحيح المدخلات",
  "shell.workspace.action.upgrade": "تحديث SoloDesk",
  "shell.workspace.rejection.auth_required":
    "المصادقة مطلوبة. يُرجى تسجيل الدخول مجدداً.",
  "shell.workspace.rejection.device_not_enrolled":
    "تسجيل الجهاز مطلوب لإنشاء مساحة عمل.",
  "shell.workspace.rejection.stale_creation_policy":
    "تغيرت سياسة الإنشاء. يُرجى التحديث والمحاولة مجدداً.",
  "shell.workspace.rejection.workspace_creation_unavailable":
    "إنشاء مساحات العمل غير متاح حالياً.",
  "shell.workspace.rejection.changed_intent":
    "تم تعديل طلب الإنشاء. يُرجى التحقق أو البدء من جديد.",
  "shell.workspace.rejection.validation":
    "يُرجى مراجعة بيانات مساحة العمل المدخلة.",
  "shell.workspace.rejection.upgrade_required": "يلزم تحديث تطبيق SoloDesk.",
  "shell.workspace.rejection.workspace_unavailable":
    "مساحة العمل المحددة غير متاحة.",
};
