import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Clock,
  Receipt,
  BarChart3,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import {
  useNavigation,
  type RouteId,
} from "../../contexts/NavigationContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import logoIcon from "@/assets/solodesk_no_bg_no_text.png";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Clock,
  Receipt,
  BarChart3,
  BookOpen,
  Settings,
};

export function SidebarNav() {
  const { activeRoute, navigateTo, isSidebarCollapsed, toggleSidebar, routes } =
    useNavigation();
  const { t } = useLocalization();

  return (
    <nav
      role="navigation"
      aria-label={t("sidebar.main_nav")}
      className={`relative flex flex-col shrink-0 border-e border-border bg-sidebar text-sidebar-foreground transition-all duration-200 select-none ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Sidebar Header with Toggle */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0 ps-1">
            <img
              src={logoIcon}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              <BdiText>{t("app.title")}</BdiText>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!isSidebarCollapsed}
          aria-label={
            isSidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")
          }
          className={`flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors ${
            isSidebarCollapsed ? "mx-auto" : ""
          }`}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <ul role="list" className="flex-1 space-y-1 p-2 overflow-y-auto">
        {routes.map((route) => {
          const Icon = iconMap[route.iconName] ?? LayoutDashboard;
          const isActive = activeRoute === route.id;
          const label = t(route.labelKey);

          const navButton = (
            <button
              type="button"
              onClick={() => navigateTo(route.id as RouteId)}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer ${
                isSidebarCollapsed
                  ? "h-10 justify-center p-0"
                  : "h-9 gap-3 px-3 text-start"
              } ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!isSidebarCollapsed && (
                <span className="truncate">
                  <BdiText>{label}</BdiText>
                </span>
              )}
            </button>
          );

          return (
            <li key={route.id}>
              {isSidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        onClick={(e) => {
                          triggerProps.onClick?.(e);
                          navigateTo(route.id as RouteId);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex w-full items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer h-10 p-0 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    )}
                  />
                  <TooltipContent side="inline-end" sideOffset={8}>
                    <BdiText>{label}</BdiText>
                  </TooltipContent>
                </Tooltip>
              ) : (
                navButton
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
