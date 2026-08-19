import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-xs font-semibold tracking-wide whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Yellow #F4D671
        primary:
          "bg-[#F4D671] text-[#1C1C1C] hover:bg-[#ebd060] active:bg-[#dfc554] shadow-xs",
        default:
          "bg-[#F4D671] text-[#1C1C1C] hover:bg-[#ebd060] active:bg-[#dfc554] shadow-xs",
        // Secondary: Green (Submit, Confirm, Fulfill, Save, Start Shift)
        secondary:
          "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs",
        // Tertiary: Grey (Cancel, Close, Reset, Back)
        tertiary:
          "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700",
        outline:
          "border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        ghost:
          "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
        // Danger: Red (Delete, Cancel Order, End Shift)
        danger:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs",
        link: "text-zinc-900 dark:text-zinc-100 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-4 text-xs",
        xs: "h-7 gap-1 px-2.5 text-[11px]",
        sm: "h-8 gap-1.5 px-3 text-xs",
        lg: "h-10 gap-2 px-5 text-sm",
        icon: "size-9",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
