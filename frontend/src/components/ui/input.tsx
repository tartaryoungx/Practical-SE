import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
