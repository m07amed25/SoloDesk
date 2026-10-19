import * as React from "react";
import { SkipLink } from "./SkipLink.tsx";
import { Titlebar } from "./Titlebar.tsx";

export interface ShellLayoutProps {
  sidebar?: React.ReactNode;
  headerUtilities?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
}

export function ShellLayout({
  sidebar,
  headerUtilities,
  breadcrumbs,
  children,
}: ShellLayoutProps) {
  return (
    <div className="flex h-screen max-h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-accent selection:text-foreground">
      <SkipLink />
      <Titlebar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar Landmark */}
        {sidebar}

        {/* Primary Content Region */}
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          {/* Top chrome / Utility Bar */}
          {(breadcrumbs || headerUtilities) && (
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3 sm:px-4 gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                {breadcrumbs}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {headerUtilities}
              </div>
            </div>
          )}

          {/* Main Content Landmark */}
          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            className="flex-1 overflow-y-auto min-h-0 p-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
