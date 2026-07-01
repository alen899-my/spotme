"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Check, Loader2, FileWarning, GripVertical } from "lucide-react"
import { createFilePreview, revokePreview } from "@/lib/compress-image"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import type { Exercise } from "@/types"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { arrayMove } from "@dnd-kit/sortable"

type PipelineStep = "idle" | "uploading" | "generating_gif" | "done" | "failed"

interface FrameEntry {
  file: File
  preview: string
}

interface UploadFramesModalProps {
  open: boolean
  onClose: () => void
  exercise: Exercise
  onPipelineComplete: (exerciseId: string, result: { framePreviews: string[] }) => void
}

function SortableFrame({
  entry,
  label,
  onRemove,
  disabled,
}: {
  entry: FrameEntry
  label: string
  onRemove: () => void
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.preview,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("relative touch-none", disabled ? "" : "cursor-grab")} {...attributes} {...listeners}>
      <div className="relative">
        <img
          src={entry.preview}
          alt={label}
          className="h-20 w-20 rounded-lg object-cover ring-1 ring-green-500/50 sm:h-24 sm:w-24"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          disabled={disabled}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-green-600 px-1.5 text-[9px] text-white">
          {label}
        </span>
      </div>
      {!disabled && (
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2">
          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
    </div>
  )
}

export function UploadFramesModal({ open, onClose, exercise, onPipelineComplete }: UploadFramesModalProps) {
  const framesInputRef = useRef<HTMLInputElement>(null)

  const [frames, setFrames] = useState<FrameEntry[]>([])

  const [step, setStep] = useState<PipelineStep>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (!open) {
      frames.forEach((f) => revokePreview(f.preview))
      setFrames([])
      setStep("idle")
      setProgress(0)
      setError("")
    }
  }, [open])

  const handleFramesSelect = (files: FileList | null) => {
    if (!files) return
    const newFrames: FrameEntry[] = [...frames]
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      newFrames.push({ file, preview: createFilePreview(file) })
    }
    frames.forEach((f) => revokePreview(f.preview))
    setFrames(newFrames)
  }

  const removeFrame = (idx: number) => {
    revokePreview(frames[idx].preview)
    setFrames((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = frames.findIndex((f) => f.preview === active.id)
    const newIndex = frames.findIndex((f) => f.preview === over.id)

    if (oldIndex === -1 || newIndex === -1) return
    setFrames(arrayMove(frames, oldIndex, newIndex))
  }

  const canSave = frames.length > 0

  const handleSave = async () => {
    if (!canSave || !exercise) return
    setStep("uploading")
    setProgress(1)
    setError("")

    try {
      setStep("uploading")
      const uploadedUrls: string[] = []
      for (let i = 0; i < frames.length; i++) {
        const fd = new FormData()
        fd.append("frame", frames[i].file)
        const resetParam = i === 0 ? "?reset=true" : ""
        const res = await api.post(`/admin/file-replacer/exercises/${exercise.id}/upload-frame${resetParam}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(5 + (i / frames.length) * 60 + Math.round((e.loaded / e.total) * (60 / frames.length)))
            }
          },
        })
        uploadedUrls.push(res.data.url)
      }
      setProgress(68)

      setStep("generating_gif")
      setProgress(70)

      const settingsRes = await api.get("/admin/file-replacer/gif-settings")
      const s = settingsRes.data

      await api.post(`/admin/file-replacer/exercises/${exercise.id}/generate-gif`, {
        frame_delay: s?.frame_delay ?? 200,
        quality: s?.quality ?? 20,
        loop_count: s?.loop_count ?? 0,
        width: 0,
        height: 0,
      })

      setProgress(100)
      setStep("done")

      onPipelineComplete(exercise.id, {
        framePreviews: uploadedUrls,
      })

      setTimeout(() => onClose(), 1000)
    } catch (err) {
      console.error("Pipeline failed:", err)
      setStep("failed")
      setError("Pipeline failed.")
    }
  }

  const isRunning = step !== "idle" && step !== "done" && step !== "failed"

  if (!exercise) return null

  return (
    <Dialog open={open} onClose={isRunning ? () => {} : onClose}>
      <DialogContent onClose={isRunning ? undefined : onClose} className="w-[calc(100%-1rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Frames — {exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Select frame images (drag to reorder)
            </p>

            {frames.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={frames.map((f) => f.preview)} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-3">
                    {frames.map((entry, idx) => (
                      <SortableFrame
                        key={entry.preview}
                        entry={entry}
                        label={`F${idx + 1}`}
                        onRemove={() => removeFrame(idx)}
                        disabled={isRunning}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className={cn("flex flex-wrap gap-3", frames.length > 0 && "mt-3")}>
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-secondary text-muted-foreground hover:border-ring sm:h-24 sm:w-24">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] text-center leading-tight">Add<br/>Images</span>
                </div>
                <input
                  ref={framesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFramesSelect(e.target.files)}
                />
              </label>
            </div>

            {frames.length > 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {frames.length} frame{frames.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {(isRunning || step === "done" || step === "failed") && (
            <div className="rounded-lg border bg-secondary/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {step === "uploading" && <><Loader2 className="h-3 w-3 animate-spin" /> Uploading & compressing...</>}
                  {step === "generating_gif" && <><Loader2 className="h-3 w-3 animate-spin" /> Generating GIF...</>}
                  {step === "done" && <><Check className="h-3 w-3 text-green-500" /> Complete!</>}
                  {step === "failed" && <><FileWarning className="h-3 w-3 text-destructive" /> {error}</>}
                </span>
                <span className="text-xs font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    step === "done" ? "bg-green-500" : step === "failed" ? "bg-destructive" : "bg-blue-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || isRunning}>
            {isRunning ? (
              <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing...</>
            ) : (
              <><Upload className="mr-1 h-3 w-3" /> Run Pipeline</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
