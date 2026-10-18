# F003 Public Errors and Localization

**Requirements**: FR-025–FR-028. **Catalogue proposal**: `F003-errors-v1`. The following Arabic is draft content for future fluent review, not a completed language-quality approval. Full screen localization/accessibility belongs to F005 and later workflows. [Bounds](primitives-and-bounds.md) apply to all messages and parameters.

## Public Error Shape

Closed fields: `code`, `messageKey`, allowlisted `params`, tagged `diagnosticId`, typed `recovery`, optional bounded `issues` and `issuesTruncated`, and `outcomeCertainty` (`not_applied`, `applied`, `unknown`). An error code does not imply outcome certainty. Correlation is supplied by the surrounding response. No raw exception, stack, SQL, token, private resource fields or arbitrary debug dictionary is permitted.

Parameter schemas are owned per message key. Initial general messages need no user-supplied body parameters. Safe optional diagnostic references are separately rendered. Field issue parameters can carry fixed declared field labels and finite limit metadata, never rejected raw values or attacker-supplied property names. Reject extra/missing/wrong-type parameters; output fallback remains bounded if internal construction fails. Error envelope maximum is 16,384 encoded bytes and 32 issues; diagnostics are content-free tagged UUIDs.

## Paired Code Catalogue

The text below illustrates the actual initial message definitions to implement. Recovery labels are separate structured content; do not concatenate fragments into localized sentences.

| Code / message key                                | English message                                                   | Arabic draft                                                         | Required recovery                                      |
| ------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| VALIDATION / error.validation                     | Check the highlighted fields.                                     | راجع الحقول المحددة.                                                 | correct_fields                                         |
| AUTH_REQUIRED / error.auth_required               | Sign in to continue.                                              | سجّل الدخول للمتابعة.                                                | sign_in                                                |
| SESSION_REVOKED / error.session_revoked           | Your session has ended. Sign in again.                            | انتهت جلستك. سجّل الدخول مرة أخرى.                                   | sign_in; retain eligible protected work                |
| FORBIDDEN / error.forbidden                       | You do not have permission to do this.                            | ليس لديك إذن لتنفيذ هذا الإجراء.                                     | refresh_access or authorized help                      |
| RESOURCE_UNAVAILABLE / error.resource_unavailable | This item is unavailable.                                         | هذا العنصر غير متاح.                                                 | refresh_access; no existence detail                    |
| REVISION_CONFLICT / error.revision_conflict       | This item changed. Review the current version.                    | تغيّر هذا العنصر. راجع النسخة الحالية.                               | resolve_conflict                                       |
| FINANCIAL_LOCK / error.financial_lock             | This record is locked. Use the permitted correction process.      | هذا السجل مقفل. استخدم إجراء التصحيح المسموح به.                     | permitted_correction                                   |
| ALLOCATION_CONFLICT / error.allocation_conflict   | The source allocation changed. Review it before continuing.       | تغيّر تخصيص المصدر. راجعه قبل المتابعة.                              | permitted_correction                                   |
| ONLINE_REQUIRED / error.online_required           | Connect to the internet to complete this action.                  | اتصل بالإنترنت لإكمال هذا الإجراء.                                   | connect; preserve eligible draft                       |
| OUTCOME_UNKNOWN / error.outcome_unknown           | The outcome is not confirmed. Check the existing operation first. | لم تتأكد نتيجة العملية. تحقّق من العملية الحالية أولاً.              | reconcile_operation                                    |
| RATE_LIMITED / error.rate_limited                 | Please wait before trying again.                                  | يُرجى الانتظار قبل المحاولة مرة أخرى.                                | retry_after only when safe                             |
| UPGRADE_REQUIRED / error.upgrade_required         | Update the app before continuing.                                 | حدّث التطبيق قبل المتابعة.                                           | upgrade; preserve original intent                      |
| SCHEMA_UNSUPPORTED / error.schema_unsupported     | This data version is unsupported. Update or use recovery.         | هذا الإصدار من البيانات غير مدعوم. حدّث التطبيق أو استخدم الاسترداد. | upgrade_or_recover                                     |
| STORAGE_UNAVAILABLE / error.storage_unavailable   | Protected storage is unavailable. Use recovery.                   | التخزين المحمي غير متاح. استخدم الاسترداد.                           | recover_storage                                        |
| KEY_UNAVAILABLE / error.key_unavailable           | The protection key is unavailable. Unlock or recover access.      | مفتاح الحماية غير متاح. افتح القفل أو استردّ الوصول.                 | recover_storage                                        |
| PROVIDER_FAILURE / error.provider_failure         | The connected service could not confirm the action.               | تعذّر على الخدمة المتصلة تأكيد الإجراء.                              | reconcile if outcome unknown; declared retry otherwise |
| SERVICE_UNAVAILABLE / error.service_unavailable   | The service is unavailable. Your action is not confirmed.         | الخدمة غير متاحة. لم يتأكد تنفيذ الإجراء.                            | outcome-aware retry/reconciliation                     |

Unknown future codes or absent keys use `error.unknown`: “The action could not be confirmed. Use the reference for help.” / “تعذّر تأكيد الإجراء. استخدم الرقم المرجعي لطلب المساعدة.” Default outcome is unknown, recovery is reconcile/help, and raw unknown text is never displayed. Missing initial-code translations still fail delivery readiness; fallback is forward-safe behavior, not an excuse for incomplete coverage.

## Initial Field-Issue Catalogue

| Stable key          | English                                                | Arabic draft                                |
| ------------------- | ------------------------------------------------------ | ------------------------------------------- |
| required            | This field is required.                                | هذا الحقل مطلوب.                            |
| unknown_field       | This field is not supported.                           | هذا الحقل غير مدعوم.                        |
| invalid_type        | Enter a value of the required type.                    | أدخل قيمة من النوع المطلوب.                 |
| invalid_format      | Check the value format.                                | تحقّق من تنسيق القيمة.                      |
| invalid_enum        | Choose a supported option.                             | اختر خيارًا مدعومًا.                        |
| unsupported_version | This version is not supported.                         | هذا الإصدار غير مدعوم.                      |
| noncanonical        | Use the required exact representation.                 | استخدم التمثيل الدقيق المطلوب.              |
| out_of_range        | The value exceeds the permitted range.                 | تتجاوز القيمة النطاق المسموح به.            |
| division_by_zero    | The divisor must not be zero.                          | يجب ألا يكون المقسوم عليه صفرًا.            |
| incompatible_unit   | These units or profiles cannot be combined.            | لا يمكن دمج هذه الوحدات أو ملفات الإعداد.   |
| non_representable   | This value cannot be represented exactly here.         | لا يمكن تمثيل هذه القيمة بدقة هنا.          |
| work_limit          | This operation exceeds the permitted processing limit. | تتجاوز هذه العملية حدّ المعالجة المسموح به. |
| duplicate_field     | A field appears more than once.                        | يظهر أحد الحقول أكثر من مرة.                |

Field paths are schema-owned segment lists with bounded collection indices; unknown property names are represented by a fixed unknown-field marker rather than echoed. Error summaries and focus association are future UI responsibilities; the logical path never contains a raw customer value.

## Recovery and Privacy Rules

Recovery is a closed union: correct_fields, sign_in, refresh_access, connect, resolve_conflict, permitted_correction, reconcile_operation, retry_after, upgrade, upgrade_or_recover, recover_storage or contact_support. `retry_after` requires explicit safe nonexecution/retry policy and a delay in the bounds profile; uncertain effects always reconcile first. No error parameter includes an executable callback, arbitrary URL or renderer file path.

Locale changes select a different complete message and preserve codes/parameters/values. Never normalize a legal name, inject bidi controls into stored IDs or interpret markup. A future renderer uses semantic text and `<bdi>`/equivalent isolation for Latin identifiers inside Arabic sentences. The conformance preview is test-only and inert; it exercises long text, combining characters, mixed reference direction, parameter parity and safe fallback. It does not create a production UI or claim full accessibility conformance.

Automated checks enumerate all 17 codes and 13 issue keys, assert equal parameter sets, prohibit missing/empty entries, inject secret/private/markup sentinels and ensure bounded output. Actual message review records readability, recovery meaning, keyboard/text selection where a preview is used and fluent Arabic review status. Missing fluent evidence remains visible rather than being inferred from automated translation checks.
