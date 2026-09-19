"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, X, FileDown } from "lucide-react"
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
  const [loading, setLoading] = useState(!!editId)

  useEffect(() => {
    if (editId) {
      api.get(`/admin/builds/${editId}`).then((res) => {
        const b = res.data?.build ?? res.data
        setTitle(b.title ?? "")
        setDescription(b.description ?? "")
        setChannel(b.build_channel ?? "production")
        setVersion(b.version ?? "")
        setVersionCode(b.version_code != null ? String(b.version_code) : "")
        setForceUpdate(!!b.force_update)
        setExistingFileUrl(b.file_url ?? null)
        setExistingFileType(b.file_type ?? null)
      }).catch(() => {}).finally(() => setLoading(false))
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
    setProgress(isEdit && !buildFile ? null : 0)
    try {
      const fd = new FormData()
      fd.append("title", title.trim())
      fd.append("description", description.trim())
      fd.append("build_channel", channel)
      if (version.trim()) fd.append("version", version.trim())
      if (versionCode.trim()) fd.append("version_code", versionCode.trim())
      fd.append("force_update", forceUpdate ? "1" : "0")
      if (buildFile) fd.append("build_file", buildFile)

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev: { loaded: number; total?: number }) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100))
        },
      }
      if (isEdit) {
        await api.put(`/admin/builds/${editId}`, fd, config)
      } else {
        await api.post("/admin/builds", fd, config)
      }
      router.push(backUrl)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrors({ form: message || `Failed to ${isEdit ? "update" : "upload"} build. Please try again.` })
    } finally {
      setSubmitting(false)
      setProgress(null)
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
    <div>
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

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
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
            className="mt-1 flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <div className="flex items-center gap-3 rounded-md border bg-secondary px-3 py-2.5">
                <FileDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{buildFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(buildFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed bg-secondary text-sm text-muted-foreground hover:border-ring">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5" />
                  {isEdit ? "Replace file (optional)" : "Upload .apk or .aab"}
                </div>
                <input
                  type="file"
                  accept=".apk,.aab"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {isEdit && !buildFile && existingFileUrl && (
              <p className="mt-2 text-xs text-muted-foreground">
                Current file: <span className="uppercase">{existingFileType}</span>{" "}
                <a href={existingFileUrl} download className="text-primary underline">Download</a>
              </p>
            )}
          </div>
          {errors.buildFile && <p className="mt-1 text-xs text-destructive">{errors.buildFile}</p>}
          {progress !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (isEdit ? "Saving..." : "Uploading...") : (isEdit ? "Save Changes" : "Upload Build")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(backUrl)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
