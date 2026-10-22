import * as React from "react";
import { preferencesManager } from "../lib/preferences.ts";
import {
  ROUTES,
  computeBreadcrumbs,
  type RouteId,
  type RouteDefinition,
  type BreadcrumbItem,
} from "../lib/routes.ts";

export type { RouteId, RouteDefinition, BreadcrumbItem };

export interface NavigationContextValue {
  activeRoute: RouteId;
  navigateTo: (routeId: RouteId) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  breadcrumbs: ReadonlyArray<BreadcrumbItem>;
  routes: readonly RouteDefinition[];
}

const NavigationContext = React.createContext<
  NavigationContextValue | undefined
>(undefined);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeRoute, setActiveRoute] = React.useState<RouteId>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(
    () => {
      const saved = preferencesManager.load().sidebarCollapsed;
      if (saved) return true;
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        return true;
      }
      return false;
    },
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState<boolean>(false);

  const toggleMobileNav = React.useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = React.useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  const navigateTo = React.useCallback((routeId: RouteId) => {
    setActiveRoute(routeId);
    setIsMobileNavOpen(false);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      preferencesManager.save({ sidebarCollapsed: next });
      return next;
    });
  }, []);

  // Auto-collapse desktop rail below 1024px; auto-close mobile drawer on desktop resize
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const collapseMql = window.matchMedia("(max-width: 1023px)");
    const desktopMql = window.matchMedia("(min-width: 768px)");

    const handleCollapse = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsSidebarCollapsed(true);
      }
    };

    const handleDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsMobileNavOpen(false);
      }
    };

    collapseMql.addEventListener("change", handleCollapse);
    desktopMql.addEventListener("change", handleDesktop);
    return () => {
      collapseMql.removeEventListener("change", handleCollapse);
      desktopMql.removeEventListener("change", handleDesktop);
    };
  }, []);

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    if (!isMobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen]);

  const breadcrumbs = React.useMemo(() => {
    return computeBreadcrumbs(activeRoute);
  }, [activeRoute]);

  const value = React.useMemo<NavigationContextValue>(
    () => ({
      activeRoute,
      navigateTo,
      isSidebarCollapsed,
      toggleSidebar,
      isMobileNavOpen,
      toggleMobileNav,
      closeMobileNav,
      breadcrumbs,
      routes: ROUTES,
    }),
    [
      activeRoute,
      navigateTo,
      isSidebarCollapsed,
      toggleSidebar,
      isMobileNavOpen,
      toggleMobileNav,
      closeMobileNav,
      breadcrumbs,
    ],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const context = React.useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
