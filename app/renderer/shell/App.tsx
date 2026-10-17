import { useState } from "react";
import { Braces, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function App() {
  const [showPlan, setShowPlan] = useState(false);
  const isMac = navigator.userAgent.includes("Macintosh");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div
        className={`window-titlebar${isMac ? " window-titlebar-mac" : ""}`}
        aria-hidden="true"
      >
        <span>SoloDesk</span>
      </div>
      <header className="flex items-center justify-between border-b border-border px-8 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Braces className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SoloDesk</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Check className="size-4" aria-hidden="true" /> Desktop shell ready
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-14 sm:px-12">
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
