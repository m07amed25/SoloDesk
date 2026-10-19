import { useLocalization } from "../../contexts/LocalizationContext.tsx";

export function SkipLink() {
  const { t } = useLocalization();

  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("main-content");
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-2 focus:outline-ring cursor-pointer"
    >
      {t("skip.content")}
    </a>
  );
}
