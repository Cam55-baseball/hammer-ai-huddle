import * as React from "react";

import { cn } from "@/lib/utils";
import { stripLeadingZeros } from "@/lib/numberInput";
import { normalizeEmail } from "@/lib/email";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onFocus, ...props }, ref) => {
    const isNum = type === "number";
    const isEmail = type === "email";
    // Number boxes: typing after a 0 must never leave "01" on screen; focusing selects the number so typing replaces it.
    // Email boxes: strip spaces/invisible characters and lowercase as typed or pasted.
    const handleChange = isNum && onChange
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const cleaned = stripLeadingZeros(e.target.value);
          if (cleaned !== e.target.value) e.target.value = cleaned;
          onChange(e);
        }
      : isEmail && onChange
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const cleaned = normalizeEmail(e.target.value);
          if (cleaned !== e.target.value) e.target.value = cleaned;
          onChange(e);
        }
      : onChange;
    const handleFocus = isNum
      ? (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.select(); onFocus?.(e); }
      : onFocus;
    const emailProps = isEmail
      ? { inputMode: "email" as const, autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
      : {};
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
        {...emailProps}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
