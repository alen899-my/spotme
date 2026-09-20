"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import { ArrowLeft, Upload, X, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSelect } from "@/components/ui/form-select"
import type { BuildChannel } from "@/types"
import api from "@/lib/api"

const CHANNELS: BuildChannel[] = ["production", "preview", "development"]

interface BuildFormProps {
  backUrl: string
  editId?: string
}

export function BuildForm({ backUrl, editId }: BuildFormProps) {
  const router = useRouter()
  const isEdit = !!editId

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [channel, setChannel] = useState<BuildChannel>("production")
  const [version, setVersion] = useState("")
  const [versionCode, setVersionCode] = useState("")
  const [forceUpdate, setForceUpdate] = useState(false)
  const [buildFile, setBuildFile] = useState<File | null>(null)
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null)
  const [existingFileType, setExistingFileType] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [progressText, setProgressText] = useState<string>("")
  const [loading, setLoading] = useState(!!editId)

  useEffect(() => {
    if (editId) {
      api
        .get(`/admin/builds/${editId}`)
        .then((res) => {
          const b = res.data?.build ?? res.data
          setTitle(b.title ?? "")
          setDescription(b.description ?? "")
          setChannel(b.build_channel ?? "production")
          setVersion(b.version ?? "")
          setVersionCode(b.version_code != null ? String(b.version_code) : "")
          setForceUpdate(!!b.force_update)
          setExistingFileUrl(b.file_url ?? null)
          setExistingFileType(b.file_type ?? null)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [editId])

  const handleFileSelect = (file: File | null) => {
    setErrors((prev) => ({ ...prev, buildFile: "" }))
    if (!file) {
      setBuildFile(null)
      return
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase()
    if (!["apk", "aab"].includes(ext)) {
      setErrors((prev) => ({ ...prev, buildFile: "Only .apk and .aab files are allowed" }))
      return
    }
    if (file.size > 1024 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, buildFile: "File size exceeds 1 GB limit" }))
      return
    }
    setBuildFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = "Title is required"
    if (!CHANNELS.includes(channel)) nextErrors.channel = "Pick a channel"
    if (!isEdit && !buildFile) nextErrors.buildFile = "Build file (.apk or .aab) is required"
    if (versionCode && !/^\d+$/.test(versionCode.trim())) nextErrors.versionCode = "Version code must be a number"
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setProgress(buildFile ? 0 : null)
    setProgressText(buildFile ? "Preparing direct upload to Cloudflare R2..." : "")

    try {
      let fileKey: string | undefined
      let fileUrl: string | undefined
      let fileSize: number | undefined = buildFile?.size
      let fileType: string | undefined = buildFile ? (buildFile.name.split(".").pop() || "").toLowerCase() : undefined

      if (buildFile) {
        let presignedSuccess = false
        try {
          setProgressText("Requesting upload URL from Cloudflare R2...")
          const presignRes = await api.post("/admin/builds/presigned-url", {
            filename: buildFile.name,
            fileType:
              buildFile.type ||
              (fileType === "apk" ? "application/vnd.android.package-archive" : "application/octet-stream"),
            fileSize: buildFile.size,
          })

          const { uploadUrl, fileKey: resKey, fileUrl: resUrl, fileType: resType } = presignRes.data
          const totalMB = (buildFile.size / (1024 * 1024)).toFixed(1)

          // Direct HTTP PUT to Cloudflare R2 (clean axios call without Bearer token)
          await axios.put(uploadUrl, buildFile, {
            headers: {
              "Content-Type":
                buildFile.type ||
                (fileType === "apk" ? "application/vnd.android.package-archive" : "application/octet-stream"),
            },
            onUploadProgress: (ev) => {
              if (ev.total) {
                const pct = Math.round((ev.loaded / ev.total) * 100)
                const loadedMB = (ev.loaded / (1024 * 1024)).toFixed(1)
                setProgress(pct)
                setProgressText(`Uploading to Cloudflare R2: ${loadedMB} MB / ${totalMB} MB (${pct}%)`)
              }
            },
          })

          fileKey = resKey
          fileUrl = resUrl
          fileType = resType
          presignedSuccess = true
          setProgressText("Upload complete. Saving build details...")
        } catch (presignErr) {
          console.warn("Direct R2 upload failed, falling back to server multipart upload:", presignErr)
        }

        // Fallback to traditional multipart upload if presigned URL is unavailable
        if (!presignedSuccess) {
          setProgress(0)
          setProgressText("Uploading through server fallback...")
          const fd = new FormData()
          fd.append("title", title.trim())
          fd.append("description", description.trim())
          fd.append("build_channel", channel)
          if (version.trim()) fd.append("version", version.trim())
          if (versionCode.trim()) fd.append("version_code", versionCode.trim())
          fd.append("force_update", forceUpdate ? "1" : "0")
          fd.append("build_file", buildFile)

          const config = {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (ev: { loaded: number; total?: number }) => {
              if (ev.total) {
                const pct = Math.round((ev.loaded / ev.total) * 100)
                const loadedMB = (ev.loaded / (1024 * 1024)).toFixed(1)
                const totalMB = (ev.total / (1024 * 1024)).toFixed(1)
                setProgress(pct)
                setProgressText(`Uploading: ${loadedMB} MB / ${totalMB} MB (${pct}%)`)
              }
            },
          }
          if (isEdit) {
            await api.put(`/admin/builds/${editId}`, fd, config)
          } else {
            await api.post("/admin/builds", fd, config)
          }
          router.push(backUrl)
          return
        }
      }

      // Save build record in database
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        build_channel: channel,
        version: version.trim() || undefined,
        version_code: versionCode.trim() || undefined,
        force_update: forceUpdate ? "1" : "0",
      }
      if (fileKey) {
        payload.file_key = fileKey
        payload.file_url = fileUrl
        payload.file_size = fileSize
        payload.file_type = fileType
      }

      if (isEdit) {
        await api.put(`/admin/builds/${editId}`, payload)
      } else {
        await api.post("/admin/builds", payload)
      }
      router.push(backUrl)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrors({ form: message || `Failed to ${isEdit ? "update" : "upload"} build. Please try again.` })
    } finally {
      setSubmitting(false)
      setProgress(null)
      setProgressText("")
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={backUrl}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit" : "New"} App Build</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Update build \u00B7 #${editId}` : "Upload a production, preview or development build"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-28 sm:pb-8">
        <div>
          <Label htmlFor="title">
            Title<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="SpotMe v1.1.0 production"
            className="mt-1"
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's new in this build..."
            rows={3}
            className="mt-1 flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>
              Channel<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <div className="mt-1">
              <FormSelect
                label="Channel"
                items={[...CHANNELS]}
                value={channel}
                onChange={(v) => setChannel((v as BuildChannel) || "production")}
                placeholder="Pick a channel"
              />
            </div>
            {errors.channel && <p className="mt-1 text-xs text-destructive">{errors.channel}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Newest upload per channel auto-becomes latest.</p>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={forceUpdate}
                onChange={(e) => setForceUpdate(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">Force update</span>
                <span className="block text-xs text-muted-foreground">App shows this build as a required update.</span>
              </span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="versionCode">Code</Label>
              <Input
                id="versionCode"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="1"
                inputMode="numeric"
                className="mt-1"
              />
              {errors.versionCode && <p className="mt-1 text-xs text-destructive">{errors.versionCode}</p>}
            </div>
          </div>
        </div>

        <div>
          <Label>
            Build File (.apk / .aab){!isEdit && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="mt-1">
            {buildFile ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/80 p-3.5 shadow-xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileDown className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{buildFile.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {(buildFile.size / (1024 * 1024)).toFixed(1)} MB &middot;{" "}
                    {(buildFile.name.split(".").pop() || "").toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  disabled={submitting}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-secondary/40 p-6 text-center transition-colors cursor-pointer hover:border-primary hover:bg-secondary/70">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {isEdit ? "Replace build file (optional)" : "Select .apk or .aab build"}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports up to 1 GB &middot; Direct Cloudflare R2 fast upload
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3.5 py-1.5 text-xs font-semibold shadow-xs hover:bg-accent text-foreground">
                  Browse files
                </div>
                <input
                  type="file"
                  accept=".apk,.aab,application/vnd.android.package-archive,application/octet-stream,*/*"
                  className="hidden"
                  disabled={submitting}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {isEdit && !buildFile && existingFileUrl && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <span>
                  Current file: <strong className="uppercase">{existingFileType}</strong>
                </span>
                <span>&middot;</span>
                <a href={existingFileUrl} download className="text-primary underline font-medium">
                  Download current file
                </a>
              </p>
            )}
          </div>
          {errors.buildFile && <p className="mt-1.5 text-xs text-destructive font-medium">{errors.buildFile}</p>}

          {progress !== null && (
            <div className="mt-3 space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  <span className="truncate">{progressText || "Uploading build..."}</span>
                </span>
                <span className="font-mono font-bold text-primary shrink-0 ml-2">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {errors.form && <p className="text-xs text-destructive font-medium">{errors.form}</p>}

        {/* Desktop Buttons */}
        <div className="hidden sm:flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="min-w-36">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {isEdit ? "Save Changes" : "Upload Build"}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(backUrl)} disabled={submitting}>
            Cancel
          </Button>
        </div>

        {/* Mobile Fixed Bottom Action Bar: Always visible on mobile screens */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 shadow-lg flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 h-11 text-sm font-semibold shadow-md flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isEdit ? "Saving..." : "Uploading..."}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{isEdit ? "Save Changes" : "Upload Build"}</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4"
            onClick={() => router.push(backUrl)}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
