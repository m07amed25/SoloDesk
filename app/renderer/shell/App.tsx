import { useEffect, useState } from "react";
import { Braces, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guidance } from "../../shared/desktop-contracts.ts";

export function App() {
  const [showPlan, setShowPlan] = useState(false);
  const [windowState, setWindowState] = useState("ready");
  const [notice, setNotice] = useState("");
  const [locale, setLocale] = useState<"en" | "ar">(
    document.documentElement.lang === "ar" ? "ar" : "en",
  );
  const isMac = navigator.userAgent.includes("Macintosh");
  const desktop = typeof window.solodesk !== "undefined";

  useEffect(() => {
    if (!desktop) return;
    let active = true;
    void window.solodesk.window.getState().then((result) => {
      if (active && result.status === "ok" && "visible" in result.data)
        setWindowState(result.data.visible ? "visible" : "hidden");
    });
    const unsubscribe = window.solodesk.lifecycle.onState((event) => {
      if (
        active &&
        event &&
        typeof event === "object" &&
        "state" in event &&
        typeof event.state === "string"
      )
        setWindowState(event.state);
    });
    const stopLinks = window.solodesk.links.onDecision((event) => {
      if (
        active &&
        event &&
        typeof event === "object" &&
        "status" in event &&
        event.status === "denied"
      )
        setNotice(guidance[locale].linkDenied);
      else if (
        active &&
        event &&
        typeof event === "object" &&
        "status" in event &&
        event.status === "unavailable"
      )
        setNotice(guidance[locale].linkUnavailable);
    });
    return () => {
      active = false;
      unsubscribe();
      stopLinks();
    };
  }, [desktop, locale]);

  async function desktopAction(
    action: "minimize" | "restore" | "requestClose",
  ) {
    const result = await window.solodesk.window[action]();
    if (result.status === "rejected") setNotice(guidance[locale].denied);
    else if (result.status === "outcome_unknown")
      setNotice(guidance[locale].interrupted);
    else if (action === "minimize") setWindowState("minimized");
    else if (action === "restore") setWindowState("visible");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div
        className={`window-titlebar${isMac ? " window-titlebar-mac" : ""}`}
        aria-hidden="true"
      >
        <span>SoloDesk</span>
      </div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-5 sm:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Braces className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SoloDesk</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4" aria-hidden="true" /> Desktop shell ready
          </span>
          {desktop && (
            <div
              className="flex flex-wrap items-center gap-1"
              aria-label="Window controls"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => void desktopAction("minimize")}
              >
                Minimize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void desktopAction("restore")}
              >
                Restore
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void desktopAction("requestClose")}
              >
                Close
              </Button>
            </div>
          )}
          {desktop && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              aria-label="Switch language"
            >
              {locale === "en" ? "العربية" : "English"}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-14 sm:px-12">
        {desktop && (
          <p className="sr-only" role="status">
            Window {windowState}
          </p>
        )}
        {notice && (
          <p
            className="mb-5 rounded-md border border-border p-3 text-sm"
            role="alert"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {notice}
          </p>
        )}
        <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          A workspace for your independent work.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
          SoloDesk now opens as a desktop app. Your projects, tasks, time
          tracking, and invoices will live here as we build the next steps.
        </p>

        <div className="mt-8">
          <Button
            variant="outline"
            aria-expanded={showPlan}
            aria-controls="planned-features"
            onClick={() => setShowPlan((open) => !open)}
          >
            {showPlan ? "Hide planned features" : "View planned features"}
            <ChevronDown
              className={showPlan ? "rotate-180" : ""}
              aria-hidden="true"
            />
          </Button>
        </div>

        <section
          id="planned-features"
          hidden={!showPlan}
          className="mt-7 border-t border-border pt-6"
        >
          <h2 className="text-base font-semibold">Planned next</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <li>Projects and clients</li>
            <li>Tasks and deadlines</li>
            <li>Time tracking</li>
            <li>Invoices and payment records</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            These features are not implemented yet.
          </p>
        </section>
      </main>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-8 py-4 text-xs text-muted-foreground sm:px-12">
        <span>Your freelance work, in one place.</span>
        <span>Foundation version 0.0.0</span>
      </footer>
    </div>
  );
}
