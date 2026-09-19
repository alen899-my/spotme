"use client"

import React, { useState } from "react"
import { User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  fallbackClassName?: string
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : ""

  const hasValidImage = Boolean(src && !imageError)

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-border bg-secondary font-mono font-semibold flex items-center justify-center select-none",
        sizeClasses[size],
        className
      )}
    >
      {hasValidImage ? (
        <img
          src={src!}
          alt={name || "User Avatar"}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : initial ? (
        <span className={cn("text-foreground font-medium", fallbackClassName)}>
          {initial}
        </span>
      ) : (
        <UserIcon className="h-1/2 w-1/2 text-muted-foreground" />
      )}
    </div>
  )
}
