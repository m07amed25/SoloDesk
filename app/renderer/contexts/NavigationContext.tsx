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

  const navigateTo = React.useCallback((routeId: RouteId) => {
    setActiveRoute(routeId);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      preferencesManager.save({ sidebarCollapsed: next });
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 1023px)");

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsSidebarCollapsed(true);
      }
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const breadcrumbs = React.useMemo(() => {
    return computeBreadcrumbs(activeRoute);
  }, [activeRoute]);

  const value = React.useMemo<NavigationContextValue>(
    () => ({
      activeRoute,
      navigateTo,
      isSidebarCollapsed,
      toggleSidebar,
      breadcrumbs,
      routes: ROUTES,
    }),
    [activeRoute, navigateTo, isSidebarCollapsed, toggleSidebar, breadcrumbs],
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
