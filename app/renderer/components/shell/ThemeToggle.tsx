import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { Button } from "../ui/button.tsx";

export function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  const { t } = useLocalization();

  const getIcon = () => {
    switch (mode) {
      case "light":
        return <Sun className="h-4 w-4" aria-hidden="true" />;
      case "dark":
        return <Moon className="h-4 w-4" aria-hidden="true" />;
      case "system":
        return <Laptop className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getModeLabel = () => {
    return t(`theme.${mode}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-8 gap-1.5 px-2.5 text-xs whitespace-nowrap shrink-0"
      aria-label={t("theme.switch_to", { mode: getModeLabel() })}
      title={t("theme.switch_to", { mode: getModeLabel() })}
    >
      {getIcon()}
      <span className="hidden sm:inline-block text-xs">{getModeLabel()}</span>
    </Button>
  );
}
