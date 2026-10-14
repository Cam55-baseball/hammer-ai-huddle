import * as React from "react";

import { cn } from "@/lib/utils";
import { stripLeadingZeros } from "@/lib/numberInput";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onFocus, ...props }, ref) => {
    const isNum = type === "number";
    // Number boxes: typing after a 0 must never leave "01" on screen; focusing selects the number so typing replaces it.
    const handleChange = isNum && onChange
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const cleaned = stripLeadingZeros(e.target.value);
          if (cleaned !== e.target.value) e.target.value = cleaned;
          onChange(e);
        }
      : onChange;
    const handleFocus = isNum
      ? (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.select(); onFocus?.(e); }
      : onFocus;
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
