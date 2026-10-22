import type { WorkspaceContextEnvelope } from "../../shared/workspace-contracts.ts";

export interface PendingEditorRegistration {
  readonly editorKey: string;
  readonly envelope: WorkspaceContextEnvelope;
  readonly canSave: boolean;
  readonly onSave: () => Promise<boolean>;
  readonly onDiscard: () => void;
  readonly onFocus?: () => void;
}

export class PendingWorkRegistry {
  private readonly editors = new Map<string, PendingEditorRegistration>();
  private readonly maxEditors = 32;

  register(reg: PendingEditorRegistration): () => void {
    if (
      this.editors.size >= this.maxEditors &&
      !this.editors.has(reg.editorKey)
    ) {
      throw new Error("pending_editors_exceeded");
    }
    this.editors.set(reg.editorKey, reg);
    return () => {
      const existing = this.editors.get(reg.editorKey);
      if (existing === reg) {
        this.editors.delete(reg.editorKey);
      }
    };
  }

  hasPendingWork(envelope?: WorkspaceContextEnvelope): boolean {
    if (!envelope) return this.editors.size > 0;
    for (const reg of this.editors.values()) {
      if (
        reg.envelope.workspaceId === envelope.workspaceId &&
        reg.envelope.selectionGeneration === envelope.selectionGeneration
      ) {
        return true;
      }
    }
    return false;
  }

  getPendingEditors(
    envelope?: WorkspaceContextEnvelope,
  ): readonly PendingEditorRegistration[] {
    const list: PendingEditorRegistration[] = [];
    for (const reg of this.editors.values()) {
      if (
        !envelope ||
        (reg.envelope.workspaceId === envelope.workspaceId &&
          reg.envelope.selectionGeneration === envelope.selectionGeneration)
      ) {
        list.push(reg);
      }
    }
    return Object.freeze(list);
  }

  focusFirst(envelope?: WorkspaceContextEnvelope): void {
    const editors = this.getPendingEditors(envelope);
    if (editors.length > 0 && editors[0].onFocus) {
      editors[0].onFocus();
    }
  }

  discardAll(envelope?: WorkspaceContextEnvelope): void {
    const editors = this.getPendingEditors(envelope);
    for (const reg of editors) {
      try {
        reg.onDiscard();
      } finally {
        this.editors.delete(reg.editorKey);
      }
    }
  }

  async saveAll(envelope?: WorkspaceContextEnvelope): Promise<boolean> {
    const editors = this.getPendingEditors(envelope);
    for (const reg of editors) {
      if (!reg.canSave) {
        return false;
      }
    }
    for (const reg of editors) {
      try {
        const ok = await reg.onSave();
        if (!ok) return false;
        this.editors.delete(reg.editorKey);
      } catch {
        return false;
      }
    }
    return true;
  }

  clearForGeneration(selectionGeneration: number): void {
    for (const [key, reg] of this.editors.entries()) {
      if (reg.envelope.selectionGeneration === selectionGeneration) {
        this.editors.delete(key);
      }
    }
  }

  clearAll(): void {
    this.editors.clear();
  }
}
