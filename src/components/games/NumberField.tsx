import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * NumberField
 * ---------------------------------------------------------------------------
 * Elite numeric input for the Game Hub.
 *
 * Fixes the long-standing bug where an input pre-populated with `0` (because
 * upstream state uses `Number("") === 0`) could not be cleared by the user.
 * The user would backspace the `0` and React would immediately re-render
 * `value={0}` — the field appeared "locked".
 *
 * Behavior:
 *   • Renders empty when the underlying value is `null`, `undefined`, `""`
 *     or `NaN`.
 *   • Maintains its own local string buffer while focused so users can freely
 *     clear the field before typing a real value.
 *   • Emits `onValueChange(number | null)` — `null` = field cleared.
 *   • Also exposes `onChange` for drop-in Input compatibility.
 *
 * Drop-in replacement pattern:
 *   <Input type="number" value={f.x} onChange={(e)=>set("x", Number(e.target.value))} />
 *   →
 *   <NumberField value={f.x} onValueChange={(v)=>set("x", v ?? 0)} />
 */

type BaseProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>;

export interface NumberFieldProps extends BaseProps {
  value: number | string | null | undefined;
  onValueChange?: (value: number | null) => void;
  /** Optional legacy passthrough — receives raw change event. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** When true, allow decimal input. Defaults to true when `step` is a decimal. */
  allowDecimal?: boolean;
}

function normalizeIncoming(v: NumberFieldProps["value"]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "";
    return String(v);
  }
  const s = String(v);
  return s;
}

export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField(
    { value, onValueChange, onChange, allowDecimal, step, inputMode, ...rest },
    ref,
  ) {
    const [focused, setFocused] = React.useState(false);
    const [buffer, setBuffer] = React.useState<string>(() =>
      normalizeIncoming(value),
    );

    // Sync buffer from prop only when not focused (avoids fighting the user).
    React.useEffect(() => {
      if (!focused) setBuffer(normalizeIncoming(value));
    }, [value, focused]);

    const stepIsDecimal =
      typeof step === "string"
        ? step.includes(".")
        : typeof step === "number"
          ? !Number.isInteger(step)
          : false;
    const decimals = allowDecimal ?? stepIsDecimal;

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      let raw = e.target.value;
      // Constrain to a safe numeric-like buffer so typing "-", "." mid-entry works.
      if (decimals) {
        raw = raw.replace(/[^\d.\-]/g, "");
      } else {
        raw = raw.replace(/[^\d\-]/g, "");
      }
      setBuffer(raw);

      if (raw === "" || raw === "-" || raw === ".") {
        onValueChange?.(null);
      } else {
        const n = Number(raw);
        if (Number.isFinite(n)) onValueChange?.(n);
      }
      onChange?.(e);
    };

    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
      setFocused(false);
      // Normalize incomplete tokens on blur.
      if (buffer === "-" || buffer === "." || buffer === "-.") {
        setBuffer("");
        onValueChange?.(null);
      }
      rest.onBlur?.(e);
    };

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
      setFocused(true);
      rest.onFocus?.(e);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode={inputMode ?? (decimals ? "decimal" : "numeric")}
        step={step}
        value={buffer}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  },
);

export default NumberField;
