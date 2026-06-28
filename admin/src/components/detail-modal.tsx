"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface DetailField<T = any> {
  key: string
  label: string
  render?: (value: any, item: T) => React.ReactNode
  className?: string
}

interface DetailModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  data: T | null
  fields: DetailField<T>[]
}

export function DetailModal<T extends Record<string, any>>({
  open,
  onClose,
  title,
  data,
  fields,
}: DetailModalProps<T>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent onClose={onClose} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const value = data?.[field.key]
            return (
              <div key={field.key} className={field.className ?? ""}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </p>
                <div className="mt-1 text-sm">
                  {field.render
                    ? field.render(value, data as T)
                    : value != null
                      ? String(value)
                      : "\u2014"}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
