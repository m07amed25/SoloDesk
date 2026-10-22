import * as React from "react";
import { Menu } from "lucide-react";
import { SkipLink } from "./SkipLink.tsx";
import { Titlebar } from "./Titlebar.tsx";
import { useNavigation } from "../../contexts/NavigationContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";

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
  const { toggleMobileNav, isMobileNavOpen } = useNavigation();
  const { t } = useLocalization();

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
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-2.5 sm:px-4 gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                <button
                  type="button"
                  onClick={toggleMobileNav}
                  aria-expanded={isMobileNavOpen}
                  aria-label={t("sidebar.open_menu")}
                  className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer shrink-0 transition-colors"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
                {breadcrumbs}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
                {headerUtilities}
              </div>
            </div>
          )}

          {/* Main Content Landmark */}
          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 md:p-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
