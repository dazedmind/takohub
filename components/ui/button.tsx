import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-100 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Yellow #F4D671 with bottom-down gradient & button bevel
        primary:
          "bg-gradient-to-b from-[#fceb9c] via-[#F4D671] to-[#e4c24f] text-[#1C1C1C] border border-[#d2b13c]/70 hover:from-[#fdf0b0] hover:to-[#dbb944] active:from-[#e2be42] active:to-[#d1ab30] active:shadow-inner",
        default:
          "bg-gradient-to-b from-[#fceb9c] via-[#F4D671] to-[#e4c24f] text-[#1C1C1C] border border-[#d2b13c]/70  hover:from-[#fdf0b0] hover:to-[#dbb944] active:from-[#e2be42] active:to-[#d1ab30] active:shadow-inner",
        // Secondary: Green (Submit, Confirm, Fulfill, Save, Start Shift) with bottom-down gradient
        secondary:
          "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border border-emerald-700/60  hover:from-emerald-400 hover:to-emerald-600 active:from-emerald-600 active:to-emerald-800 active:shadow-inner",
        // Tertiary: Grey (Cancel, Close, Reset, Back) with bottom-down gradient
        tertiary:
          "bg-gradient-to-b from-white to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700  hover:from-zinc-50 hover:to-zinc-200 dark:hover:from-zinc-700 dark:hover:to-zinc-850 active:shadow-inner",
        outline:
          "bg-gradient-to-b from-white to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700  hover:from-zinc-50 hover:to-zinc-200 dark:hover:from-zinc-700 dark:hover:to-zinc-850 active:shadow-inner",
        ghost:
          "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
        // Danger: Red (Delete, Cancel Order, End Shift) with bottom-down gradient
        danger:
          "bg-gradient-to-b from-red-500 to-red-700 text-white border border-red-700/60  hover:from-red-400 hover:to-red-600 active:from-red-600 active:to-red-800 active:shadow-inner",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-700 text-white border border-red-700/60  hover:from-red-400 hover:to-red-600 active:from-red-600 active:to-red-800 active:shadow-inner",
        // Orange with bottom-down gradient & button bevel
        orange:
          "bg-gradient-to-b from-[#ff8c42] via-[#f97316] to-[#ea580c] text-white border border-[#c2410c]/70 hover:from-[#ffa05c] hover:to-[#dc4d04] active:from-[#ea580c] active:to-[#c2410c] active:shadow-inner",
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
