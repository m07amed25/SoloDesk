// Initial catalogue; Arabic fluent review is recorded separately in F003 QA.
export const en: Readonly<Record<string, string>> = Object.freeze({
  "error.validation": "Check the highlighted fields.",
  "error.auth_required": "Sign in to continue.",
  "error.session_revoked": "Your session has ended. Sign in again.",
  "error.forbidden": "You do not have permission to do this.",
  "error.resource_unavailable": "This item is unavailable.",
  "error.revision_conflict": "This item changed. Review the current version.",
  "error.financial_lock":
    "This record is locked. Use the permitted correction process.",
  "error.allocation_conflict":
    "The source allocation changed. Review it before continuing.",
  "error.online_required": "Connect to the internet to complete this action.",
  "error.outcome_unknown":
    "The outcome is not confirmed. Check the existing operation first.",
  "error.rate_limited": "Please wait before trying again.",
  "error.upgrade_required": "Update the app before continuing.",
  "error.schema_unsupported":
    "This data version is unsupported. Update or use recovery.",
  "error.storage_unavailable":
    "Protected storage is unavailable. Use recovery.",
  "error.key_unavailable":
    "The protection key is unavailable. Unlock or recover access.",
  "error.provider_failure":
    "The connected service could not confirm the action.",
  "error.service_unavailable":
    "The service is unavailable. Your action is not confirmed.",
  "issue.required": "This field is required.",
  "issue.unknown_field": "This field is not supported.",
  "issue.invalid_type": "Enter a value of the required type.",
  "issue.invalid_format": "Check the value format.",
  "issue.invalid_enum": "Choose a supported option.",
  "issue.unsupported_version": "This version is not supported.",
  "issue.noncanonical": "Use the required exact representation.",
  "issue.out_of_range": "The value exceeds the permitted range.",
  "issue.division_by_zero": "The divisor must not be zero.",
  "issue.incompatible_unit": "These units or profiles cannot be combined.",
  "issue.non_representable": "This value cannot be represented exactly here.",
  "issue.work_limit": "This operation exceeds the permitted processing limit.",
  "issue.duplicate_field": "A field appears more than once.",
  "error.unknown":
    "The action could not be confirmed. Use the reference for help.",
});
