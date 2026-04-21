import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full rounded-lg border bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
InputGroup.displayName = "InputGroup";

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "block-end";
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "start", ...props }, ref) => {
    const alignClass =
      align === "end"
        ? "items-center border-l"
        : align === "block-end"
        ? "items-end border-t pt-2"
        : "items-center border-l";

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex flex-shrink-0 gap-2 px-3 py-2",
          alignClass,
          className
        )}
        {...props}
      />
    );
  }
);
InputGroupAddon.displayName = "InputGroupAddon";

export interface InputGroupTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-l-lg border-0 bg-transparent p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        {...props}
      />
    );
  }
);
InputGroupTextarea.displayName = "InputGroupTextarea";

export { InputGroup, InputGroupAddon, InputGroupTextarea };
