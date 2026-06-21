"use client"

import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      outline: "text-foreground",
      success: "border-transparent bg-emerald-500/15 text-emerald-500",
      warning: "border-transparent bg-amber-500/15 text-amber-500",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, type BadgeProps }
