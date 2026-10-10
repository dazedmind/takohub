import * as React from "react"

import { cn } from "@/lib/utils"

function formatNumberWithCommas(
  val: string | number | readonly string[] | undefined,
  allowNegative = true
): string {
  if (val === undefined || val === null || val === "") return "";
  const str = String(val);

  const isNegative = allowNegative && str.startsWith("-");
  const withoutSign = str.replace(/^-/, "");

  const parts = withoutSign.split(".");
  const intPart = parts[0].replace(/\D/g, "");

  if (!intPart && parts.length === 1) {
    return isNegative ? "-" : "";
  }

  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";

  if (parts.length > 1) {
    const decPart = parts.slice(1).join("").replace(/\D/g, "");
    return `${isNegative ? "-" : ""}${formattedInt}.${decPart}`;
  }

  return `${isNegative ? "-" : ""}${formattedInt}`;
}

function cleanNumberString(val: string, allowNegative = true): string {
  if (!val) return "";
  const isNegative = allowNegative && val.startsWith("-");
  const withoutSign = val.replace(/^-/, "");

  const parts = withoutSign.split(".");
  const intPart = parts[0].replace(/\D/g, "");

  if (parts.length > 1) {
    const decPart = parts.slice(1).join("").replace(/\D/g, "");
    return `${isNegative ? "-" : ""}${intPart}.${decPart}`;
  }

  return `${isNegative ? "-" : ""}${intPart}`;
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (
    {
      className,
      type,
      value,
      defaultValue,
      onChange,
      onKeyDown,
      min,
      ...props
    },
    ref
  ) => {
    const isNumber = type === "number";
    const allowNegative = min === undefined || Number(min) < 0;

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref]
    );

    // Track internal formatted display value for uncontrolled inputs
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      isNumber ? formatNumberWithCommas(defaultValue, allowNegative) : ""
    );

    // Compute display value
    const displayValue = isNumber
      ? value !== undefined
        ? formatNumberWithCommas(value, allowNegative)
        : uncontrolledValue
      : (value as any);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isNumber) {
        onChange?.(e);
        return;
      }

      const input = e.target;
      const rawInput = input.value;
      const cursor = input.selectionStart ?? rawInput.length;

      // Count digits/symbols before the cursor in the typed string
      const charsBeforeCursor = rawInput.slice(0, cursor).replace(/[^\d.-]/g, "").length;

      const clean = cleanNumberString(rawInput, allowNegative);
      const formatted = formatNumberWithCommas(rawInput, allowNegative);

      // Find new cursor position in the formatted string
      let newCursor = formatted.length;
      let charsSeen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/[\d.-]/.test(formatted[i])) {
          charsSeen++;
        }
        if (charsSeen === charsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }

      setUncontrolledValue(formatted);

      // Maintain cursor position after render
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      });

      if (onChange) {
        e.target.value = clean;
        onChange(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isNumber && e.key === "Backspace") {
        const input = e.currentTarget;
        const { selectionStart, selectionEnd } = input;
        if (
          selectionStart !== null &&
          selectionStart === selectionEnd &&
          selectionStart > 1
        ) {
          // If backspacing right after a comma, delete the digit before the comma
          if (input.value[selectionStart - 1] === ",") {
            e.preventDefault();
            const before = input.value.slice(0, selectionStart - 2);
            const after = input.value.slice(selectionStart);
            const newRaw = before + after;
            const clean = cleanNumberString(newRaw, allowNegative);
            const formatted = formatNumberWithCommas(newRaw, allowNegative);

            const newCursor = Math.max(0, selectionStart - 2);
            setUncontrolledValue(formatted);

            requestAnimationFrame(() => {
              if (inputRef.current) {
                inputRef.current.setSelectionRange(newCursor, newCursor);
              }
            });

            if (onChange) {
              const syntheticEvent = {
                ...e,
                target: { ...input, value: clean },
                currentTarget: { ...input, value: clean },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }
            return;
          }
        }
      }
      onKeyDown?.(e);
    };

    return (
      <input
        ref={setRefs}
        type={isNumber ? "text" : type}
        inputMode={isNumber ? "decimal" : props.inputMode}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 border border-transparent border-b-input bg-transparent px-0 py-1 text-base transition-[color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-b-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50",
          className
        )}
        value={displayValue}
        defaultValue={isNumber ? undefined : defaultValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
