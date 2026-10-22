import * as React from "react";
import type {
  WorkspaceState,
  WorkspaceSummary,
  WorkspaceContextEnvelope,
} from "../../shared/workspace-contracts.ts";
import {
  PendingWorkRegistry,
  type PendingEditorRegistration,
} from "./pending-work-registry.ts";

export interface WorkspaceContextValue {
  readonly state: WorkspaceState | null;
  readonly currentWorkspace?: WorkspaceSummary;
  readonly selectableWorkspaces: readonly WorkspaceSummary[];
  readonly selectionGeneration: number;
  readonly envelope: WorkspaceContextEnvelope | null;
  readonly isSwitching: boolean;
  readonly hasPendingEdits: boolean;
  readonly pendingEditors: readonly PendingEditorRegistration[];
  readonly targetWorkspaceId: string | null;
  readonly isPendingSwitchDialogOpen: boolean;
  registerPendingEditor: (
    registration: Omit<PendingEditorRegistration, "envelope">,
  ) => () => void;
  requestSwitch: (targetWorkspaceId: string) => Promise<boolean>;
  confirmDiscardAndSwitch: () => Promise<boolean>;
  confirmSaveAndSwitch: () => Promise<boolean>;
  cancelSwitch: () => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(
  null,
);

export interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [state, setState] = React.useState<WorkspaceState | null>(null);
  const [pendingSwitchTarget, setPendingSwitchTarget] = React.useState<
    string | null
  >(null);
  const [registryVersion, setRegistryVersion] = React.useState(0);

  const [registry] = React.useState(() => new PendingWorkRegistry());

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.solodesk?.workspace) {
      const unsub = window.solodesk.workspace.onStateChanged((newState) => {
        setState(newState);
      });
      void window.solodesk.workspace.getState().then((initial) => {
        if (initial) setState(initial);
      });
      return unsub;
    }
  }, []);

  const selectionGeneration = state?.selectionGeneration ?? 1;
  const currentWorkspace = state?.current;

  const envelope = React.useMemo<WorkspaceContextEnvelope | null>(() => {
    if (!currentWorkspace) return null;
    return Object.freeze({
      profileReference: "default",
      profileGeneration: 1,
      workspaceId: currentWorkspace.workspaceId,
      selectionGeneration,
    });
  }, [currentWorkspace, selectionGeneration]);

  // Clean registry when generation advances
  React.useEffect(() => {
    registry.clearForGeneration(selectionGeneration - 1);
  }, [registry, selectionGeneration]);

  const registerPendingEditor = React.useCallback(
    (registration: Omit<PendingEditorRegistration, "envelope">) => {
      if (!envelope) return () => {};
      const fullReg: PendingEditorRegistration = {
        ...registration,
        envelope,
      };
      const unregister = registry.register(fullReg);
      setRegistryVersion((v) => v + 1);

      return () => {
        unregister();
        setRegistryVersion((v) => v + 1);
      };
    },
    [envelope, registry],
  );

  const pendingEditors = React.useMemo(() => {
    // depend on registryVersion to refresh
    void registryVersion;
    return envelope ? registry.getPendingEditors(envelope) : [];
  }, [envelope, registry, registryVersion]);

  const hasPendingEdits = pendingEditors.length > 0;

  const requestSwitch = React.useCallback(
    async (targetWorkspaceId: string): Promise<boolean> => {
      if (!targetWorkspaceId) return false;
      if (currentWorkspace?.workspaceId === targetWorkspaceId) return true;

      if (envelope && registry.hasPendingWork(envelope)) {
        setPendingSwitchTarget(targetWorkspaceId);
        return false;
      }

      if (window.solodesk?.workspace) {
        const res = await window.solodesk.workspace.switch({
          targetWorkspaceId,
          expectedSelectionGeneration: selectionGeneration,
        });
        if (res?.success) {
          const next = await window.solodesk.workspace.getState();
          if (next) setState(next);
          return true;
        }
        return false;
      }
      return false;
    },
    [currentWorkspace, envelope, registry, selectionGeneration],
  );

  const confirmDiscardAndSwitch =
    React.useCallback(async (): Promise<boolean> => {
      if (!pendingSwitchTarget) return false;
      if (!envelope || envelope.selectionGeneration !== selectionGeneration) {
        setPendingSwitchTarget(null);
        return false;
      }
      registry.discardAll(envelope);
      setRegistryVersion((v) => v + 1);
      const target = pendingSwitchTarget;
      setPendingSwitchTarget(null);

      if (window.solodesk?.workspace) {
        const res = await window.solodesk.workspace.switch({
          targetWorkspaceId: target,
          expectedSelectionGeneration: selectionGeneration,
        });
        if (res?.success) {
          const next = await window.solodesk.workspace.getState();
          if (next) setState(next);
          return true;
        }
        return false;
      }
      return false;
    }, [envelope, pendingSwitchTarget, registry, selectionGeneration]);

  const confirmSaveAndSwitch = React.useCallback(async (): Promise<boolean> => {
    if (!pendingSwitchTarget) return false;
    if (!envelope || envelope.selectionGeneration !== selectionGeneration) {
      setPendingSwitchTarget(null);
      return false;
    }
    const saved = await registry.saveAll(envelope);
    setRegistryVersion((v) => v + 1);
    if (!saved) {
      return false;
    }
    const target = pendingSwitchTarget;
    setPendingSwitchTarget(null);

    if (window.solodesk?.workspace) {
      const res = await window.solodesk.workspace.switch({
        targetWorkspaceId: target,
        expectedSelectionGeneration: selectionGeneration,
      });
      if (res?.success) {
        const next = await window.solodesk.workspace.getState();
        if (next) setState(next);
        return true;
      }
      return false;
    }
    return false;
  }, [envelope, pendingSwitchTarget, registry, selectionGeneration]);

  const cancelSwitch = React.useCallback(() => {
    if (envelope) {
      registry.focusFirst(envelope);
    }
    setPendingSwitchTarget(null);
  }, [envelope, registry]);

  const refresh = React.useCallback(async () => {
    try {
      if (window.solodesk?.workspace) {
        const immediate = await window.solodesk.workspace.getState();
        if (immediate) setState(immediate);
        const res = await window.solodesk.workspace.refresh();
        if (res) setState(res);
      }
    } catch {
      // Keep the last known workspace state while offline.
    }
  }, []);

  const value = React.useMemo<WorkspaceContextValue>(() => {
    return {
      state,
      currentWorkspace,
      selectableWorkspaces: state?.selectable ?? [],
      selectionGeneration,
      envelope,
      isSwitching: state?.lifecycle === "switching",
      hasPendingEdits,
      pendingEditors,
      targetWorkspaceId: pendingSwitchTarget,
      isPendingSwitchDialogOpen: Boolean(pendingSwitchTarget),
      registerPendingEditor,
      requestSwitch,
      confirmDiscardAndSwitch,
      confirmSaveAndSwitch,
      cancelSwitch,
      refresh,
    };
  }, [
    state,
    currentWorkspace,
    selectionGeneration,
    envelope,
    hasPendingEdits,
    pendingEditors,
    pendingSwitchTarget,
    registerPendingEditor,
    requestSwitch,
    confirmDiscardAndSwitch,
    confirmSaveAndSwitch,
    cancelSwitch,
    refresh,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

export function useOptionalWorkspace(): WorkspaceContextValue | null {
  return React.useContext(WorkspaceContext);
}
