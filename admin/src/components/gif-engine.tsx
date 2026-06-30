"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Settings, Play, Pause, Save, Upload, X } from "lucide-react"
import { createFilePreview, revokePreview } from "@/lib/compress-image"
import api from "@/lib/api"
import type { GifSettings } from "@/types"

interface GifEngineProps {
  open: boolean
  onClose: () => void
}

const DEFAULT_SETTINGS: GifSettings = {
  frameDelay: 200,
  loopCount: 0,
  quality: 20,
  width: 300,
  height: 300,
}

export function GifEngine({ open, onClose }: GifEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useState<GifSettings>(DEFAULT_SETTINGS)
  const [playing, setPlaying] = useState(false)

  const [framePreviews, setFramePreviews] = useState<(string | null)[]>([null, null, null])
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([])

  const animRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      setPlaying(false)
      return
    }
    api.get("/admin/file-replacer/gif-settings").then((res) => {
      if (res.data?.frame_delay != null) {
        setSettings({
          frameDelay: res.data.frame_delay,
          loopCount: res.data.loop_count,
          quality: res.data.quality,
          width: res.data.width,
          height: res.data.height,
        })
      }
    }).catch(() => {})

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [open])

  useEffect(() => {
    const urls = framePreviews.filter((p): p is string => p !== null)
    if (urls.length === 0) {
      setLoadedImages([])
      setPlaying(false)
      return
    }
    const images = urls.map((url) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = url
      return img
    })
    setLoadedImages(images)
  }, [framePreviews])

  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = loadedImages[idx]
    if (!img?.complete) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = settings.width
    canvas.height = settings.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [loadedImages, settings.width, settings.height])

  useEffect(() => {
    if (loadedImages.length < 2) {
      if (loadedImages.length === 1) drawFrame(0)
      return
    }
    setPlaying(true)
  }, [loadedImages])

  useEffect(() => {
    if (!playing || loadedImages.length < 2) return

    if (animRef.current) cancelAnimationFrame(animRef.current)

    let lastTime = 0
    let idx = 0

    const animate = (time: number) => {
      if (!playing) return
      if (time - lastTime >= settings.frameDelay) {
        idx = (idx + 1) % loadedImages.length
        drawFrame(idx)
        lastTime = time
      }
      animRef.current = requestAnimationFrame(animate)
    }

    drawFrame(0)
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [playing, loadedImages, settings.frameDelay, drawFrame])

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const newPreviews: (string | null)[] = [null, null, null]
    for (let i = 0; i < Math.min(3, files.length); i++) {
      newPreviews[i] = createFilePreview(files[i])
    }
    framePreviews.forEach((p) => { if (p) revokePreview(p) })
    setFramePreviews(newPreviews)
  }

  const removeFrame = (idx: number) => {
    if (framePreviews[idx]) revokePreview(framePreviews[idx]!)
    const newPreviews = [...framePreviews]
    newPreviews[idx] = null
    setFramePreviews(newPreviews)
  }

  const handleSaveSettings = async () => {
    try {
      await api.put("/admin/file-replacer/gif-settings", {
        frame_delay: settings.frameDelay,
        loop_count: settings.loopCount,
        quality: settings.quality,
        width: settings.width,
        height: settings.height,
      })
    } catch {}
  }

  const updateSetting = (key: keyof GifSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const loadedCount = framePreviews.filter((p) => p !== null).length

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent onClose={onClose} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            GIF Engine — Live Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border bg-black"
              style={{ aspectRatio: `${settings.width}/${settings.height}`, maxHeight: 320 }}
            />
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaying(!playing)}
                disabled={loadedImages.length < 2}
              >
                {playing ? (
                  <><Pause className="mr-1 h-3 w-3" /> Pause</>
                ) : (
                  <><Play className="mr-1 h-3 w-3" /> {loadedImages.length < 2 ? "Upload frames" : "Play"}</>
                )}
              </Button>
              {loadedCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {loadedCount} of 3 frames
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="relative">
                  {framePreviews[idx] ? (
                    <div className="relative">
                      <img src={framePreviews[idx]!} alt={`F${idx + 1}`} className="h-14 w-14 rounded-md object-cover ring-1 ring-green-500/50" />
                      <button
                        onClick={() => removeFrame(idx)}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-green-600 px-1 text-[8px] text-white">F{idx + 1}</span>
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed bg-secondary text-muted-foreground">
                      <span className="text-xs font-semibold">{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))}
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border border-dashed bg-secondary text-muted-foreground hover:border-ring">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div>
              <Label>Frame Delay</Label>
              <input
                type="range"
                min={50}
                max={1000}
                step={10}
                value={settings.frameDelay}
                onChange={(e) => updateSetting("frameDelay", Number(e.target.value))}
                className="mt-1 w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50ms</span>
                <span className="font-medium text-foreground">{settings.frameDelay}ms</span>
                <span>1000ms</span>
              </div>
            </div>

            <div>
              <Label>Loop (0 = infinite)</Label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.loopCount}
                onChange={(e) => updateSetting("loopCount", Number(e.target.value))}
                className="mt-1 w-full rounded-md border bg-secondary px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <Label>Quality (1 best — 20 fastest)</Label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={settings.quality}
                onChange={(e) => updateSetting("quality", Number(e.target.value))}
                className="mt-1 w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Best</span>
                <span className="font-medium text-foreground">{settings.quality}</span>
                <span>Fast</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Width</Label>
                <input
                  type="number"
                  min={50}
                  max={1920}
                  step={10}
                  value={settings.width}
                  onChange={(e) => updateSetting("width", Number(e.target.value))}
                  className="mt-1 w-full rounded-md border bg-secondary px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <Label>Height</Label>
                <input
                  type="number"
                  min={50}
                  max={1920}
                  step={10}
                  value={settings.height}
                  onChange={(e) => updateSetting("height", Number(e.target.value))}
                  className="mt-1 w-full rounded-md border bg-secondary px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleSaveSettings}>
            <Save className="mr-1 h-3 w-3" />
            Save as Default
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
