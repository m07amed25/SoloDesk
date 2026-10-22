import { ChevronRight } from "lucide-react";
import { useNavigation } from "../../contexts/NavigationContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { BdiText } from "../ui/bdi-text.tsx";

export function BreadcrumbTrail() {
  const { breadcrumbs, navigateTo } = useNavigation();
  const { t } = useLocalization();

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
      <ol
        role="list"
        className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap min-w-0"
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const label = t(item.labelKey);

          return (
            <li
              key={item.routeId}
              className="flex items-center gap-1.5 min-w-0 truncate"
            >
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {isLast || item.isCurrent ? (
                <span
                  aria-current="page"
                  className="font-semibold text-foreground select-none truncate max-w-[120px] sm:max-w-none"
                >
                  <BdiText>{label}</BdiText>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateTo(item.routeId)}
                  className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring rounded-xs transition-colors cursor-pointer truncate max-w-[90px] sm:max-w-none"
                >
                  <BdiText>{label}</BdiText>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
