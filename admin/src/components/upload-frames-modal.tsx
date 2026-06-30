"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Check, Loader2, FileWarning } from "lucide-react"
import { createFilePreview, revokePreview } from "@/lib/compress-image"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import type { Exercise } from "@/types"

type PipelineStep = "idle" | "uploading" | "generating_gif" | "done" | "failed"

interface UploadFramesModalProps {
  open: boolean
  onClose: () => void
  exercise: Exercise
  onPipelineComplete: (exerciseId: string, result: { framePreviews: string[] }) => void
}

export function UploadFramesModal({ open, onClose, exercise, onPipelineComplete }: UploadFramesModalProps) {
  const framesInputRef = useRef<HTMLInputElement>(null)

  const [frameFiles, setFrameFiles] = useState<(File | null)[]>([null, null, null])
  const [framePreviews, setFramePreviews] = useState<(string | null)[]>([null, null, null])

  const [step, setStep] = useState<PipelineStep>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      setFrameFiles([null, null, null])
      framePreviews.forEach((p) => { if (p) revokePreview(p) })
      setFramePreviews([null, null, null])
      setStep("idle")
      setProgress(0)
      setError("")
    }
  }, [open])

  const handleFramesSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles: (File | null)[] = [null, null, null]
    const newPreviews: (string | null)[] = [null, null, null]

    for (let i = 0; i < Math.min(3, files.length); i++) {
      const file = files[i]
      newFiles[i] = file
      newPreviews[i] = createFilePreview(file)
    }

    framePreviews.forEach((p) => { if (p) revokePreview(p) })

    setFrameFiles(newFiles)
    setFramePreviews(newPreviews)
  }

  const removeFrame = (idx: number) => {
    if (framePreviews[idx]) revokePreview(framePreviews[idx]!)
    const newFiles = [...frameFiles]
    const newPreviews = [...framePreviews]
    newFiles[idx] = null
    newPreviews[idx] = null
    setFrameFiles(newFiles)
    setFramePreviews(newPreviews)
  }

  const canSave = frameFiles.some((f) => f !== null)

  const handleSave = async () => {
    if (!canSave) return
    setStep("uploading")
    setProgress(1)
    setError("")

    try {
      setStep("uploading")
      const uploadedUrls: string[] = []
      for (let i = 0; i < 3; i++) {
        if (frameFiles[i]) {
          const fd = new FormData()
          fd.append("frame", frameFiles[i]!)
          const res = await api.post(`/admin/file-replacer/exercises/${exercise.id}/upload-frame?frame=${i + 1}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
              if (e.total) {
                setProgress(5 + i * 20 + Math.round((e.loaded / e.total) * 18))
              }
            },
          })
          uploadedUrls.push(res.data.url)
        }
      }
      setProgress(65)

      setStep("generating_gif")
      setProgress(68)

      const settingsRes = await api.get("/admin/file-replacer/gif-settings")
      const s = settingsRes.data

      await api.post(`/admin/file-replacer/exercises/${exercise.id}/generate-gif`, {
        frame_delay: s?.frame_delay ?? 200,
        quality: s?.quality ?? 20,
        loop_count: s?.loop_count ?? 0,
        width: s?.width ?? 300,
        height: s?.height ?? 300,
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
      <DialogContent onClose={isRunning ? undefined : onClose} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload 3 Frames — {exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Select 3 frame images (starting position, mid lift, peak contraction)
            </p>
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="relative">
                  {framePreviews[idx] ? (
                    <div className="relative">
                      <img
                        src={framePreviews[idx]!}
                        alt={`Frame ${idx + 1}`}
                        className="h-24 w-24 rounded-lg object-cover ring-1 ring-green-500/50"
                      />
                      <button
                        onClick={() => removeFrame(idx)}
                        disabled={isRunning}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-green-600 px-1.5 text-[9px] text-white">
                        F{idx + 1}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed bg-secondary text-muted-foreground">
                      <span className="text-lg font-semibold">{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-secondary text-muted-foreground hover:border-ring">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] text-center leading-tight">Select<br/>3 Files</span>
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
            {frameFiles.some((f) => f !== null) && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {frameFiles.filter((f) => f !== null).length} of 3 selected
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
