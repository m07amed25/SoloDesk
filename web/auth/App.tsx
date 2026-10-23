import React, { useState } from "react";
import { InvitationRedemption } from "./invitation.tsx";

export const App: React.FC = () => {
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const pathname = window.location.pathname;

  if (pathname === "/invitation" || pathname.startsWith("/invitation/")) {
    return (
      <InvitationRedemption
        authToken={authToken}
        onSignInRequest={() => {
          // Trigger F010 sign-in flow
          window.location.href = `/sign-in?returnTo=${encodeURIComponent(window.location.pathname)}`;
        }}
        onSwitchAccountRequest={() => {
          // Trigger F010 account switch
          window.location.href = `/sign-in?prompt=select_account&returnTo=${encodeURIComponent(window.location.pathname)}`;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">SoloDesk Account Security</h1>
        <p className="text-sm text-slate-400">
          Hosted authentication and device enrollment runtime.
        </p>
      </div>
    </div>
  );
};
