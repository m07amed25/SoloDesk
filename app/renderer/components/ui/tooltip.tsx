import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "../../lib/utils.ts";

export const TooltipProvider = BaseTooltip.Provider;
export const Tooltip = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;

export interface TooltipContentProps extends React.ComponentPropsWithoutRef<
  typeof BaseTooltip.Popup
> {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
}

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(
  (
    {
      className,
      sideOffset = 4,
      side = "inline-end",
      align = "center",
      children,
      ...props
    },
    ref,
  ) => (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} sideOffset={sideOffset} align={align}>
        <BaseTooltip.Popup
          ref={ref}
          className={cn(
            "z-50 overflow-hidden rounded-md border border-border bg-foreground px-3 py-1.5 text-xs text-background shadow-md transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 select-none",
            className,
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  ),
);
TooltipContent.displayName = "TooltipContent";
