"use client"

import { useRef, useState } from "react"
import { Upload, X, Check, Loader2, Image as ImageIcon } from "lucide-react"
import { compressImage, createFilePreview, revokePreview } from "@/lib/compress-image"
import { cn } from "@/lib/utils"

interface FrameUploaderProps {
  frameIndex: number
  accept?: string
  onUpload: (file: File) => Promise<void>
  className?: string
}

export function FrameUploader({ frameIndex, accept = "image/*", onUpload, className }: FrameUploaderProps) {
  const [state, setState] = useState<"idle" | "compressing" | "uploading" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return

    setState("compressing")
    try {
      const compressed = await compressImage(file)
      const url = createFilePreview(compressed)
      setPreview(url)

      setState("uploading")
      await onUpload(compressed)

      setState("done")
    } catch {
      setState("error")
    }
  }

  const handleRemove = () => {
    if (preview) revokePreview(preview)
    setPreview(null)
    setState("idle")
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ""
  }

  const labels = ["Frame 1 (New Thumbnail)", "Frame 2", "Frame 3"]

  return (
    <div className={cn("relative", className)}>
      {state === "done" && preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt={`Frame ${frameIndex + 1}`}
            className="h-12 w-12 rounded object-cover ring-1 ring-green-500/50"
          />
          <button
            onClick={handleRemove}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : state === "compressing" || state === "uploading" ? (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
          <div className="flex flex-col items-center gap-0.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">{state === "compressing" ? "Comp" : "Up"}</span>
          </div>
        </div>
      ) : state === "error" ? (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-destructive/10">
          <button onClick={() => { setState("idle"); if (inputRef.current) inputRef.current.value = "" }}>
            <Upload className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ) : (
        <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded bg-secondary text-muted-foreground hover:bg-secondary/80">
          <ImageIcon className="h-4 w-4" />
          <span className="sr-only">{labels[frameIndex]}</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  )
}
