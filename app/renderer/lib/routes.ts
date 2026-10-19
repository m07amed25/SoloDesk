export type RouteId =
  | "overview"
  | "my-work"
  | "projects"
  | "clients"
  | "time"
  | "finance"
  | "reports"
  | "knowledge"
  | "settings";

export interface RouteDefinition {
  id: RouteId;
  path: string;
  labelKey: string;
  iconName: string;
  status: "active" | "placeholder";
  targetPhase: string;
  order: number;
}

export const ROUTES: readonly RouteDefinition[] = Object.freeze([
  {
    id: "overview",
    path: "/",
    labelKey: "nav.overview",
    iconName: "LayoutDashboard",
    status: "active",
    targetPhase: "F005",
    order: 1,
  },
  {
    id: "my-work",
    path: "/my-work",
    labelKey: "nav.my_work",
    iconName: "CheckSquare",
    status: "placeholder",
    targetPhase: "F028",
    order: 2,
  },
  {
    id: "projects",
    path: "/projects",
    labelKey: "nav.projects",
    iconName: "FolderKanban",
    status: "placeholder",
    targetPhase: "F029",
    order: 3,
  },
  {
    id: "clients",
    path: "/clients",
    labelKey: "nav.clients",
    iconName: "Users",
    status: "placeholder",
    targetPhase: "F024",
    order: 4,
  },
  {
    id: "time",
    path: "/time",
    labelKey: "nav.time",
    iconName: "Clock",
    status: "placeholder",
    targetPhase: "F036",
    order: 5,
  },
  {
    id: "finance",
    path: "/finance",
    labelKey: "nav.finance",
    iconName: "Receipt",
    status: "placeholder",
    targetPhase: "F042",
    order: 6,
  },
  {
    id: "reports",
    path: "/reports",
    labelKey: "nav.reports",
    iconName: "BarChart3",
    status: "placeholder",
    targetPhase: "F050",
    order: 7,
  },
  {
    id: "knowledge",
    path: "/knowledge",
    labelKey: "nav.knowledge",
    iconName: "BookOpen",
    status: "placeholder",
    targetPhase: "F055",
    order: 8,
  },
  {
    id: "settings",
    path: "/settings",
    labelKey: "nav.settings",
    iconName: "Settings",
    status: "active",
    targetPhase: "F005",
    order: 9,
  },
]);

export function getRouteDefinition(id: RouteId): RouteDefinition | undefined {
  return ROUTES.find((r) => r.id === id);
}

export interface BreadcrumbItem {
  labelKey: string;
  routeId: RouteId;
  isCurrent: boolean;
}

export function computeBreadcrumbs(
  routeId: RouteId,
): ReadonlyArray<BreadcrumbItem> {
  const currentRoute = getRouteDefinition(routeId);
  if (!currentRoute || routeId === "overview") {
    return [
      {
        labelKey: "nav.overview",
        routeId: "overview",
        isCurrent: true,
      },
    ];
  }

  return [
    {
      labelKey: "nav.overview",
      routeId: "overview",
      isCurrent: false,
    },
    {
      labelKey: currentRoute.labelKey,
      routeId: currentRoute.id,
      isCurrent: true,
    },
  ];
}
