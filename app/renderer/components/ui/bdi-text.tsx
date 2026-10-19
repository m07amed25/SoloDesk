import * as React from "react";
import { cn } from "../../lib/utils.ts";
import { isolateBidi, isLtrToken, LRM, RLM } from "../../lib/bidi.ts";

export { isolateBidi, isLtrToken, LRM, RLM };

export interface BdiTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  forceLtr?: boolean;
}

/**
 * Accessible bidirectional isolation wrapper component.
 * Uses native <bdi> tag with Unicode isolation marks to guarantee that emails,
 * invoice IDs, numbers, and technical tokens do not suffer inverted punctuation
 * or visual corruption in Arabic RTL contexts.
 */
export const BdiText = React.forwardRef<HTMLElement, BdiTextProps>(
  ({ children, forceLtr = false, className, ...props }, ref) => {
    return (
      <bdi
        ref={ref}
        dir={forceLtr ? "ltr" : "auto"}
        className={cn("inline-block unicode-bidi-isolate", className)}
        {...props}
      >
        {typeof children === "string" && (forceLtr || isLtrToken(children))
          ? isolateBidi(children)
          : children}
      </bdi>
    );
  }
);
BdiText.displayName = "BdiText";
