"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const DialogOverlay = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("fixed inset-0 z-50 bg-black/60", className)}
    {...props}
  />
)

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg",
        className
      )}
      {...props}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
)

const DialogDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex items-center justify-end gap-3", className)} {...props} />
)

export function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null

  return (
    <>
      <DialogOverlay onClick={onClose} />
      {children}
    </>
  )
}

export { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
