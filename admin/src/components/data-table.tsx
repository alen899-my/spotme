"use client"

import { useState, useMemo } from "react"
import { Search, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  deleteTitle?: string
  deleteDescription?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  page?: number
  limit?: number
  total?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSortChange?: (key: string) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyMessage = "No results found.",
  onView,
  onEdit,
  onDelete,
  deleteTitle = "Confirm deletion",
  deleteDescription = "Are you sure you want to delete this item? This action cannot be undone.",
  searchValue,
  onSearchChange,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  sortBy,
  sortOrder,
  onSortChange,
}: DataTableProps<T>) {
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)

  const isPaginated = page !== undefined && limit !== undefined && total !== undefined && onPageChange !== undefined && onLimitChange !== undefined

  const hasActions = !!(onView || onEdit || onDelete)

  const SortIcon = (colKey: string) => {
    if (colKey !== sortBy) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
    return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  return (
    <div>
      {onSearchChange && (
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-full rounded-md border bg-secondary pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.className,
                    col.hideOnMobile && "hidden md:table-cell",
                    col.sortable && "cursor-pointer select-none"
                  )}
                  onClick={() => {
                    if (col.sortable && onSortChange) onSortChange(col.key)
                  }}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && SortIcon(col.key)}
                  </span>
                </TableHead>
              ))}
              {hasActions && (
                <TableHead className="w-24 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(col.hideOnMobile && "hidden md:table-cell")}>
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.className, col.hideOnMobile && "hidden md:table-cell")}
                    >
                      {col.render ? col.render(item) : String((item as any)[col.key] ?? "")}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(item)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isPaginated && (
        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogContent onClose={() => setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>{deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  onDelete?.(deleteTarget)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
