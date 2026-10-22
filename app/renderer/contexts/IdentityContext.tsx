import * as React from "react";
import type { RendererIdentityState } from "../../shared/identity-contracts.ts";

export interface IdentityContextValue {
  readonly state: RendererIdentityState | null;
  readonly isAuthenticated: boolean;
  readonly isEnrolled: boolean;
  readonly isEnrolling: boolean;
  readonly displayName?: string;
  readonly displayIdentifier?: string;
  readonly avatarUrl?: string;
  readonly safeDeviceLabel?: string;
  readonly authDialogOpen: boolean;
  setAuthDialogOpen: (open: boolean) => void;
  openAuthDialog: () => void;
  signOut: () => Promise<void>;
  confirmEnrollment: (label?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const IdentityContext = React.createContext<IdentityContextValue | null>(null);

export interface IdentityProviderProps {
  children: React.ReactNode;
}

export function IdentityProvider({ children }: IdentityProviderProps) {
  const [state, setState] = React.useState<RendererIdentityState | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (typeof window !== "undefined" && window.solodesk?.identity) {
      try {
        const current = await window.solodesk.identity.getState();
        setState(current);
      } catch {
        // Retain last known state if offline/unavailable
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.solodesk?.identity) return;

    let active = true;
    void window.solodesk.identity
      .getState()
      .then((current) => {
        if (active && current) setState(current);
      })
      .catch(() => {});

    const unsubscribe = window.solodesk.identity.onStateChanged((next) => {
      if (active) setState(next);
    });

    const handleOpenAuth = () => {
      setAuthDialogOpen(true);
    };

    window.addEventListener("solodesk:open-auth-dialog", handleOpenAuth);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("solodesk:open-auth-dialog", handleOpenAuth);
    };
  }, []);

  const openAuthDialog = React.useCallback(() => {
    setAuthDialogOpen(true);
  }, []);

  const signOut = React.useCallback(async () => {
    if (typeof window !== "undefined" && window.solodesk?.identity) {
      try {
        const next = await window.solodesk.identity.signOut();
        setState(next);
      } catch (error) {
        console.error("Sign out failed:", error);
      }
    }
  }, []);

  const confirmEnrollment = React.useCallback(async (label?: string) => {
    if (typeof window !== "undefined" && window.solodesk?.identity) {
      try {
        const next = await window.solodesk.identity.confirmEnrollment(label);
        setState(next);
      } catch (error) {
        console.error("Enrollment confirmation failed:", error);
      }
    }
  }, []);

  const isAuthenticated = Boolean(
    state?.sessionStatus === "current" &&
    (state?.displayName ||
      state?.displayIdentifier ||
      state?.lifecycle === "enrolled" ||
      state?.lifecycle === "enrolling"),
  );

  const isEnrolled = state?.lifecycle === "enrolled";
  const isEnrolling = state?.lifecycle === "enrolling";

  const value = React.useMemo<IdentityContextValue>(() => {
    return {
      state,
      isAuthenticated,
      isEnrolled,
      isEnrolling,
      displayName: state?.displayName,
      displayIdentifier: state?.displayIdentifier,
      avatarUrl: state?.avatarUrl,
      safeDeviceLabel: state?.safeDeviceLabel,
      authDialogOpen,
      setAuthDialogOpen,
      openAuthDialog,
      signOut,
      confirmEnrollment,
      refresh,
    };
  }, [
    state,
    isAuthenticated,
    isEnrolled,
    isEnrolling,
    authDialogOpen,
    openAuthDialog,
    signOut,
    confirmEnrollment,
    refresh,
  ]);

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const context = React.useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return context;
}
