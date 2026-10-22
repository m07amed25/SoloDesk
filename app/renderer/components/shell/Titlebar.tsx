import * as React from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { bridge, type WindowState } from "../../lib/bridge.ts";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import logoIcon from "@/assets/solodesk_no_bg_no_text.png";

export function Titlebar() {
  const { t } = useLocalization();
  const [windowState, setWindowState] = React.useState<WindowState>({
    visible: true,
    minimized: false,
    maximized: false,
    focused: true,
  });

  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

  React.useEffect(() => {
    let active = true;

    const syncState = () => {
      void bridge.window.getState().then((res) => {
        if (active && res.status === "ok") {
          setWindowState(res.data);
        }
      });
    };

    syncState();
    window.addEventListener("resize", syncState);

    const cleanup = bridge.lifecycle.onState((event) => {
      if (active) {
        if (event.state === "minimized") {
          setWindowState((prev) => ({ ...prev, minimized: true }));
        } else if (event.state === "visible" || event.state === "ready") {
          setWindowState((prev) => ({ ...prev, minimized: false }));
        }
      }
    });

    return () => {
      active = false;
      window.removeEventListener("resize", syncState);
      cleanup();
    };
  }, []);

  const handleMinimize = async () => {
    await bridge.window.minimize();
  };

  const handleMaximize = async () => {
    await bridge.window.restore();
    const res = await bridge.window.getState();
    if (res.status === "ok") {
      setWindowState(res.data);
    } else {
      setWindowState((prev) => ({ ...prev, maximized: !prev.maximized }));
    }
  };

  const handleClose = async () => {
    await bridge.window.requestClose();
  };

  return (
    <header
      role="banner"
      aria-label="Desktop titlebar"
      onDoubleClick={handleMaximize}
      dir="ltr"
      className="window-titlebar relative flex h-9 w-full shrink-0 items-center justify-between border-b border-border bg-surface px-3 text-xs select-none"
    >
      <div
        className={`flex items-center gap-2 min-w-0 ${isMac ? "ms-[72px]" : "ms-0 pe-36"}`}
      >
        <span className="font-semibold text-foreground tracking-tight flex items-center gap-2 min-w-0 truncate">
          <img
            src={logoIcon}
            alt=""
            aria-hidden="true"
            className="h-4 w-4 shrink-0 object-contain"
          />
          <span className="truncate">
            <BdiText>{t("app.title")}</BdiText>
          </span>
        </span>
      </div>

      <div
        dir="ltr"
        className="no-drag absolute top-0 right-0 flex h-full items-center"
        style={{ position: "absolute", right: 0, top: 0, direction: "ltr" }}
      >
        <button
          type="button"
          onClick={handleMinimize}
          className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors"
          aria-label={t("window.minimize")}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors"
          aria-label={
            windowState.maximized ? t("window.restore") : t("window.maximize")
          }
        >
          {windowState.maximized ? (
            <Copy className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors"
          aria-label={t("window.close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
