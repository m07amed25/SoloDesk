import crypto from "node:crypto";
import {
  type WorkspaceState,
  type WorkspaceSummary,
  type WorkspaceCreationRequest,
  type WorkspaceCreationResult,
  type WorkspaceCreationPolicySafe,
  type ActiveWorkspaceSelection,
  type WorkspaceLifecycle,
  type SafeReasonCode,
  type SafeActionCode,
  type WorkspaceContextEnvelope,
  isValidWorkspaceId,
  computeCreationRequestDigest,
  isMatchingContextEnvelope,
} from "../../shared/workspace-contracts.ts";
import type { ProtectedIdentityStore } from "../identity/protected-identity-store.ts";
import type { PersistenceService } from "../persistence/persistence-service.ts";
import type { WorkspaceService } from "./workspace-service.ts";

export interface WorkspaceCoordinatorOptions {
  readonly profileId: string;
  readonly getProfileGeneration: () => number;
  readonly getAccount: () => { issuerId: string; subjectId: string } | null;
  readonly getAccessToken: () => Promise<string | null>;
  readonly getDeviceEnrollmentId: () => string | null;
  readonly persistence: PersistenceService;
  readonly identityStore: ProtectedIdentityStore;
  readonly workspaceService: WorkspaceService;
}

export class WorkspaceCoordinator {
  private readonly profileId: string;
  private readonly getProfileGeneration: () => number;
  private readonly getAccount: () => {
    issuerId: string;
    subjectId: string;
  } | null;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly getDeviceEnrollmentId: () => string | null;
  private readonly persistence: PersistenceService;
  private readonly identityStore: ProtectedIdentityStore;
  private readonly service: WorkspaceService;

  private selectionGeneration = 1;
  private lifecycle: WorkspaceLifecycle = "loading";
  private currentSummary?: WorkspaceSummary;
  private targetSummary?: {
    workspaceId: string;
    displayName: string;
    discriminator: string;
  };
  private selectableWorkspaces: WorkspaceSummary[] = [];
  private creationPolicy?: WorkspaceCreationPolicySafe;
  private messageKey?: string;
  private actionKey?: string;
  private diagnosticId?: string;
  private nextActions: SafeActionCode[] = [];

  private isBusy = false;
  private busyQueue: (() => void)[] = [];
  private readonly listeners = new Set<(state: WorkspaceState) => void>();

  constructor(options: WorkspaceCoordinatorOptions) {
    this.profileId = options.profileId;
    this.getProfileGeneration = options.getProfileGeneration;
    this.getAccount = options.getAccount;
    this.getAccessToken = options.getAccessToken;
    this.getDeviceEnrollmentId = options.getDeviceEnrollmentId;
    this.persistence = options.persistence;
    this.identityStore = options.identityStore;
    this.service = options.workspaceService;
  }

  get currentWorkspaceId(): string | undefined {
    return this.currentSummary?.workspaceId;
  }

  get currentSelectionGeneration(): number {
    return this.selectionGeneration;
  }

  getContextEnvelope(): WorkspaceContextEnvelope | null {
    if (!this.currentSummary) return null;
    return Object.freeze({
      profileReference: this.profileId,
      profileGeneration: this.getProfileGeneration(),
      workspaceId: this.currentSummary.workspaceId,
      selectionGeneration: this.selectionGeneration,
    });
  }

  isCurrentContext(candidate: unknown): boolean {
    const current = this.getContextEnvelope();
    if (!current) return false;
    return isMatchingContextEnvelope(
      candidate as WorkspaceContextEnvelope,
      current,
    );
  }

  assertMatchingContext(candidate: unknown): void {
    if (!this.isCurrentContext(candidate)) {
      throw new Error("stale_context");
    }
  }

  onStateChanged(listener: (state: WorkspaceState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(): WorkspaceState {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Listener errors do not interrupt coordinator state
      }
    }
    return state;
  }

  getState(): WorkspaceState {
    return Object.freeze({
      version: 1,
      lifecycle: this.lifecycle,
      selectionGeneration: this.selectionGeneration,
      current: this.currentSummary
        ? Object.freeze({ ...this.currentSummary })
        : undefined,
      target: this.targetSummary
        ? Object.freeze({ ...this.targetSummary })
        : undefined,
      selectable: Object.freeze([...this.selectableWorkspaces]),
      creation: this.creationPolicy
        ? Object.freeze({ ...this.creationPolicy })
        : undefined,
      messageKey: this.messageKey,
      actionKey: this.actionKey,
      diagnosticId: this.diagnosticId,
      nextActions: Object.freeze([...this.nextActions]),
    });
  }

  private async acquireLock(): Promise<() => void> {
    if (!this.isBusy) {
      this.isBusy = true;
      return () => this.releaseLock();
    }
    return new Promise((resolve) => {
      this.busyQueue.push(() => {
        this.isBusy = true;
        resolve(() => this.releaseLock());
      });
    });
  }

  private releaseLock(): void {
    this.isBusy = false;
    const next = this.busyQueue.shift();
    if (next) {
      next();
    }
  }

  async bootstrap(): Promise<WorkspaceState> {
    const unlock = await this.acquireLock();
    try {
      this.lifecycle = "loading";
      this.publish();

      const account = this.getAccount();
      if (!account) {
        this.lifecycle = "locked";
        this.messageKey = "shell.workspace.recovery.authRequired";
        this.actionKey = "shell.workspace.action.signInAgain";
        this.nextActions = ["sign_in_again"];
        return this.publish();
      }

      // Check sealed local selection record
      const savedSelection = this.identityStore.loadWorkspaceSelection({
        issuerId: account.issuerId,
        subjectId: account.subjectId,
        profileReference: this.profileId,
        profileGeneration: this.getProfileGeneration(),
      });

      if (savedSelection) {
        this.selectionGeneration = Math.max(
          this.selectionGeneration,
          savedSelection.selectionGeneration,
        );
      }

      const token = await this.getAccessToken();
      if (!token) {
        // Offline without lease: fail closed with online_required
        this.lifecycle = "online_required";
        this.messageKey = "shell.workspace.recovery.onlineRequired";
        this.actionKey = "shell.workspace.action.reconnect";
        this.nextActions = ["reconnect", "choose_another_workspace"];
        return this.publish();
      }

      let bootstrapData;
      try {
        bootstrapData = await this.service.getBootstrap(token);
        this.creationPolicy = bootstrapData.creation;
        this.selectableWorkspaces = [...bootstrapData.workspaces];
      } catch (err) {
        this.lifecycle = "online_required";
        this.messageKey = "shell.workspace.recovery.serviceUnavailable";
        this.actionKey = "shell.workspace.action.retry";
        this.nextActions = ["retry"];
        return this.publish();
      }

      // If no selectable workspaces, transition to no_workspace
      if (this.selectableWorkspaces.length === 0) {
        this.lifecycle = "no_workspace";
        this.currentSummary = undefined;
        this.targetSummary = undefined;
        this.nextActions = this.creationPolicy?.enabled ? ["retry"] : [];
        return this.publish();
      }

      // Determine candidate workspace to activate
      let candidateId: string | undefined;
      if (
        savedSelection &&
        savedSelection.state === "current" &&
        savedSelection.currentWorkspaceId
      ) {
        candidateId = savedSelection.currentWorkspaceId;
      } else if (
        savedSelection &&
        savedSelection.state === "switching" &&
        savedSelection.currentWorkspaceId
      ) {
        // Interrupted switch: converge back to safe source
        candidateId = savedSelection.currentWorkspaceId;
      }

      const candidateSummary = candidateId
        ? this.selectableWorkspaces.find((w) => w.workspaceId === candidateId)
        : this.selectableWorkspaces[0];

      if (!candidateSummary) {
        this.lifecycle = "locked";
        this.messageKey = "shell.workspace.recovery.workspaceUnavailable";
        this.actionKey = "shell.workspace.action.chooseAnotherWorkspace";
        this.nextActions = ["choose_another_workspace", "refresh"];
        return this.publish();
      }

      // Attempt retained open for candidate
      const openResult = await this.persistence.openRetainedWorkspace(
        candidateSummary.workspaceId,
      );

      if (openResult.status === "ready") {
        this.currentSummary = candidateSummary;
        this.lifecycle = "ready";
        this.messageKey = undefined;
        this.actionKey = undefined;
        this.diagnosticId = undefined;
        this.nextActions = [];
        this.saveSelectionRecord("current", candidateSummary.workspaceId);
      } else {
        this.lifecycle = "locked";
        this.messageKey = "shell.workspace.recovery.localPartitionMissing";
        this.actionKey = "shell.workspace.action.chooseAnotherWorkspace";
        this.nextActions = ["choose_another_workspace", "approved_recovery"];
        this.saveSelectionRecord(
          "locked",
          candidateSummary.workspaceId,
          undefined,
          "local_partition_missing",
        );
      }

      return this.publish();
    } finally {
      unlock();
    }
  }

  async create(
    profile: {
      displayName: string;
      legalName?: string;
      tradeName?: string;
      defaultTimezone: string;
      defaultCurrency: string;
      defaultLocale: "en" | "ar";
      profileVersion: 1;
      creationPolicyVersion: number | string;
    },
    explicitIntentId?: string,
  ): Promise<WorkspaceCreationResult> {
    const unlock = await this.acquireLock();
    try {
      this.lifecycle = "creating";
      this.publish();

      const account = this.getAccount();
      const token = await this.getAccessToken();
      const deviceEnrollmentId = this.getDeviceEnrollmentId();

      if (!account || !token) {
        this.lifecycle = "locked";
        this.nextActions = ["sign_in_again"];
        this.publish();
        return {
          status: "rejected",
          code: "auth_required",
          diagnosticId: "err-auth-required",
          recovery: "sign_in_again",
        };
      }

      if (!deviceEnrollmentId) {
        this.lifecycle = "locked";
        this.nextActions = ["reenroll_device"];
        this.publish();
        return {
          status: "rejected",
          code: "device_not_enrolled",
          diagnosticId: "err-dev-enrolled",
          recovery: "reenroll_device",
        };
      }

      const intentId = explicitIntentId || crypto.randomUUID();
      const requestPayload = {
        version: 1 as const,
        intentId,
        deviceEnrollmentId,
        profile: {
          displayName: profile.displayName.trim(),
          legalName: profile.legalName ? profile.legalName.trim() : undefined,
          tradeName: profile.tradeName ? profile.tradeName.trim() : undefined,
          defaultTimezone: profile.defaultTimezone,
          defaultCurrency: profile.defaultCurrency.toUpperCase(),
          defaultLocale: profile.defaultLocale,
          profileVersion: 1 as const,
          creationPolicyVersion: profile.creationPolicyVersion,
        },
      };

      const requestDigest = computeCreationRequestDigest(requestPayload);
      const fullRequest: WorkspaceCreationRequest = {
        ...requestPayload,
        requestDigest,
      };

      const result = await this.service.createWorkspace(token, fullRequest);

      if (result.status === "committed") {
        // Authoritative creation succeeded
        this.selectionGeneration += 1;
        const newWorkspaceId = result.workspace.workspaceId;

        // Explicit local initialization with creation receipt
        const initResult = await this.persistence.initializeAuthorizedWorkspace(
          newWorkspaceId,
          result.receiptId,
        );

        if (initResult.status === "ready") {
          this.currentSummary = result.workspace;
          this.selectableWorkspaces = [
            ...this.selectableWorkspaces.filter(
              (w) => w.workspaceId !== newWorkspaceId,
            ),
            result.workspace,
          ];
          this.lifecycle = "ready";
          this.messageKey = undefined;
          this.actionKey = undefined;
          this.nextActions = [];
          this.saveSelectionRecord("current", newWorkspaceId);
        } else {
          // Cloud committed but local partition failed: lock with recovery
          this.lifecycle = "locked";
          this.messageKey = "shell.workspace.recovery.localPartitionMissing";
          this.actionKey = "shell.workspace.action.retry";
          this.nextActions = ["retry", "approved_recovery"];
          this.saveSelectionRecord(
            "locked",
            newWorkspaceId,
            undefined,
            "local_partition_missing",
          );
        }
      } else if (result.status === "rejected") {
        this.lifecycle = this.currentSummary ? "ready" : "no_workspace";
        this.messageKey = `shell.workspace.rejection.${result.code}`;
        this.actionKey = `shell.workspace.action.${result.recovery}`;
        this.nextActions = [result.recovery];
      } else {
        // outcome_unknown
        this.lifecycle = "reconciling";
        this.messageKey = "shell.workspace.recovery.outcomeUnknown";
        this.actionKey = "shell.workspace.action.reconcileCreation";
        this.nextActions = ["reconcile_creation"];
      }

      this.publish();
      return result;
    } finally {
      unlock();
    }
  }

  async reconcileCreation(intentId: string): Promise<WorkspaceCreationResult> {
    const unlock = await this.acquireLock();
    try {
      this.lifecycle = "reconciling";
      this.publish();

      const token = await this.getAccessToken();
      if (!token) {
        return {
          status: "rejected",
          code: "auth_required",
          diagnosticId: "err-auth-req",
          recovery: "sign_in_again",
        };
      }

      const result = await this.service.reconcileCreation(token, intentId);

      if (result.status === "committed") {
        this.selectionGeneration += 1;
        const newWorkspaceId = result.workspace.workspaceId;
        const initResult = await this.persistence.initializeAuthorizedWorkspace(
          newWorkspaceId,
          result.receiptId,
        );

        if (initResult.status === "ready") {
          this.currentSummary = result.workspace;
          this.selectableWorkspaces = [
            ...this.selectableWorkspaces.filter(
              (w) => w.workspaceId !== newWorkspaceId,
            ),
            result.workspace,
          ];
          this.lifecycle = "ready";
          this.nextActions = [];
          this.saveSelectionRecord("current", newWorkspaceId);
        } else {
          this.lifecycle = "locked";
          this.messageKey = "shell.workspace.recovery.localPartitionMissing";
          this.nextActions = ["retry", "approved_recovery"];
          this.saveSelectionRecord(
            "locked",
            newWorkspaceId,
            undefined,
            "local_partition_missing",
          );
        }
      } else if (result.status === "proven_not_created") {
        this.lifecycle = this.currentSummary ? "ready" : "no_workspace";
        this.nextActions = ["correct_input"];
      } else if (result.status === "rejected") {
        this.lifecycle = this.currentSummary ? "ready" : "no_workspace";
        this.nextActions = [result.recovery];
      } else {
        this.lifecycle = "reconciling";
        this.nextActions = ["reconcile_creation"];
      }

      this.publish();
      return result;
    } finally {
      unlock();
    }
  }

  async switch(
    targetWorkspaceId: string,
    expectedSelectionGeneration: number,
  ): Promise<{
    success: boolean;
    code?: SafeReasonCode;
    recovery?: SafeActionCode;
  }> {
    const unlock = await this.acquireLock();
    try {
      if (expectedSelectionGeneration !== this.selectionGeneration) {
        return {
          success: false,
          code: "stale_context",
          recovery: "refresh_workspace",
        };
      }

      if (!isValidWorkspaceId(targetWorkspaceId, true)) {
        return {
          success: false,
          code: "workspace_unavailable",
          recovery: "choose_another_workspace",
        };
      }

      const sourceWorkspaceId = this.currentSummary?.workspaceId;
      if (sourceWorkspaceId === targetWorkspaceId) {
        return { success: true };
      }

      const targetMeta = this.selectableWorkspaces.find(
        (w) => w.workspaceId === targetWorkspaceId,
      );
      this.targetSummary = targetMeta
        ? {
            workspaceId: targetMeta.workspaceId,
            displayName: targetMeta.displayName,
            discriminator: targetMeta.discriminator,
          }
        : {
            workspaceId: targetWorkspaceId,
            displayName: "Workspace",
            discriminator: targetWorkspaceId.slice(-4),
          };

      // 1. Advance generation and enter switching state
      this.selectionGeneration += 1;
      this.lifecycle = "switching";
      this.saveSelectionRecord(
        "switching",
        sourceWorkspaceId,
        targetWorkspaceId,
      );
      this.publish();

      // 2. Close source partition cleanly
      if (sourceWorkspaceId) {
        await this.persistence.closeWorkspaceStore(sourceWorkspaceId);
      }

      // 3. Online authority recheck for target
      const token = await this.getAccessToken();
      if (!token) {
        // Offline: selection is locked
        await this.restoreOrLockSource(
          sourceWorkspaceId,
          "online_required",
          "reconnect",
        );
        return {
          success: false,
          code: "online_required",
          recovery: "reconnect",
        };
      }

      const check = await this.service.checkSelectability(
        token,
        targetWorkspaceId,
      );
      if (check.status !== "selectable") {
        await this.restoreOrLockSource(
          sourceWorkspaceId,
          "workspace_unavailable",
          "choose_another_workspace",
        );
        return {
          success: false,
          code: "workspace_unavailable",
          recovery: "choose_another_workspace",
        };
      }

      // 4. Open retained target store
      const openResult =
        await this.persistence.openRetainedWorkspace(targetWorkspaceId);
      if (openResult.status !== "ready") {
        await this.restoreOrLockSource(
          sourceWorkspaceId,
          "local_partition_missing",
          "choose_another_workspace",
        );
        return {
          success: false,
          code: "local_partition_missing",
          recovery: "choose_another_workspace",
        };
      }

      // 5. Commit target
      this.currentSummary = check.workspace;
      this.targetSummary = undefined;
      this.lifecycle = "ready";
      this.messageKey = undefined;
      this.actionKey = undefined;
      this.diagnosticId = undefined;
      this.nextActions = [];
      this.saveSelectionRecord("current", targetWorkspaceId);
      this.publish();

      return { success: true };
    } finally {
      unlock();
    }
  }

  private async restoreOrLockSource(
    sourceWorkspaceId: string | undefined,
    reason: SafeReasonCode,
    action: SafeActionCode,
  ): Promise<void> {
    this.targetSummary = undefined;
    if (sourceWorkspaceId) {
      const reopen =
        await this.persistence.openRetainedWorkspace(sourceWorkspaceId);
      if (reopen.status === "ready") {
        const sourceMeta = this.selectableWorkspaces.find(
          (w) => w.workspaceId === sourceWorkspaceId,
        );
        if (sourceMeta) {
          this.currentSummary = sourceMeta;
          this.lifecycle = "ready";
          this.messageKey = `shell.workspace.recovery.${reason}`;
          this.actionKey = `shell.workspace.action.${action}`;
          this.nextActions = [action];
          this.saveSelectionRecord("current", sourceWorkspaceId);
          this.publish();
          return;
        }
      }
    }
    // Cannot reopen source: lock
    this.lifecycle = "locked";
    this.currentSummary = undefined;
    this.messageKey = `shell.workspace.recovery.${reason}`;
    this.actionKey = `shell.workspace.action.${action}`;
    this.nextActions = [action, "choose_another_workspace"];
    this.saveSelectionRecord("locked", sourceWorkspaceId, undefined, reason);
    this.publish();
  }

  async refresh(): Promise<WorkspaceState> {
    if (
      !this.currentSummary &&
      (this.lifecycle === "loading" ||
        this.lifecycle === "online_required" ||
        this.messageKey === "shell.workspace.recovery.authRequired")
    )
      return this.bootstrap();
    try {
      const token = await this.getAccessToken();
      if (token) {
        const bootstrap = await this.service.getBootstrap(token);
        this.creationPolicy = bootstrap.creation;
        this.selectableWorkspaces = [...bootstrap.workspaces];
        const list = bootstrap.workspaces;
        if (this.currentSummary) {
          const updatedCurrent = list.find(
            (w) => w.workspaceId === this.currentSummary?.workspaceId,
          );
          if (updatedCurrent) {
            this.currentSummary = updatedCurrent;
          } else {
            // Current workspace membership was revoked!
            this.selectionGeneration += 1;
            if (this.currentSummary.workspaceId) {
              await this.persistence.closeWorkspaceStore(
                this.currentSummary.workspaceId,
              );
            }
            this.currentSummary = undefined;
            this.lifecycle = "locked";
            this.messageKey = "shell.workspace.recovery.workspaceUnavailable";
            this.actionKey = "shell.workspace.action.chooseAnotherWorkspace";
            this.nextActions = ["choose_another_workspace"];
            this.saveSelectionRecord(
              "locked",
              undefined,
              undefined,
              "workspace_unavailable",
            );
          }
        }
      }
    } catch {
      // Leave existing cache on session or network failure.
    }
    return this.publish();
  }

  private saveSelectionRecord(
    state: "none" | "current" | "switching" | "locked",
    currentWorkspaceId?: string,
    targetWorkspaceId?: string,
    safeReasonCode?: SafeReasonCode,
  ): void {
    const account = this.getAccount();
    if (!account) return;
    try {
      const record: ActiveWorkspaceSelection = {
        formatVersion: 1,
        profileReference: this.profileId,
        profileGeneration: this.getProfileGeneration(),
        issuerId: account.issuerId,
        subjectId: account.subjectId,
        selectionGeneration: this.selectionGeneration,
        state,
        currentWorkspaceId:
          state === "current" || state === "switching" || state === "locked"
            ? currentWorkspaceId
            : undefined,
        targetWorkspaceId:
          state === "switching" ? targetWorkspaceId : undefined,
        attemptId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        pendingWorkDecision: "not_required",
        safeReasonCode,
        updatedAt: new Date().toISOString(),
      };
      this.identityStore.saveWorkspaceSelection(record);
    } catch {
      // Protection errors preserve memory state
    }
  }

  /**
   * Authoritative discovery of newly accepted memberships (F013 T040).
   * Refreshes workspace authority from the server and returns updated selectable workspaces.
   * Requires explicit user selection to switch active workspace; never switches automatically.
   */
  async discoverAcceptedMemberships(): Promise<readonly WorkspaceSummary[]> {
    await this.refresh();
    return Object.freeze([...this.selectableWorkspaces]);
  }

  async dispose(): Promise<void> {
    this.selectionGeneration += 1;
    if (this.currentSummary?.workspaceId) {
      await this.persistence.closeWorkspaceStore(
        this.currentSummary.workspaceId,
      );
    }
    this.currentSummary = undefined;
    this.targetSummary = undefined;
    this.lifecycle = "loading";
    this.selectableWorkspaces = [];
  }
}
