"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { compressImage, createFilePreview, revokePreview } from "@/lib/compress-image"

interface LibraryFormProps {
  slug: string
  label: string
  backUrl: string
  editId?: string
}

export function LibraryForm({ slug, label, backUrl, editId }: LibraryFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [loading, setLoading] = useState(!!editId)

  const isEdit = !!editId

  useEffect(() => {
    if (editId) {
      api.get(`/admin/${slug}/${editId}`).then((res) => {
        const item = res.data?.[slug.replace("-", "_")] ?? res.data
        setName(item.name ?? "")
        setExistingImage(item.image_url ?? null)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [editId, slug])

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      if (isEdit) setRemoveImage(true)
      return
    }
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setImagePreview(createFilePreview(compressed))
      if (isEdit) setRemoveImage(false)
    } catch {
      setImageFile(file)
      setImagePreview(createFilePreview(file))
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!name.trim()) {
      setErrors({ name: "Name is required" })
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("name", name.trim())
      if (imageFile) fd.append("image", imageFile)
      else if (removeImage) fd.append("remove_image", "1")

      if (isEdit) {
        await api.put(`/admin/${slug}/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      } else {
        await api.post(`/admin/${slug}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }
      router.push(backUrl)
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrors({ name: `${label.slice(0, -1)} with this name already exists` })
      } else {
        setErrors({ name: `Failed to ${isEdit ? "update" : "create"} ${label.toLowerCase()}. Please try again.` })
      }
    } finally {
      setSubmitting(false)
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
          <h1 className="text-xl font-semibold">{isEdit ? "Edit" : "New"} {label.slice(0, -1)}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update" : "Add a new"} {label.toLowerCase().slice(0, -1)}
            {isEdit && ` \u00B7 #${editId}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <Label htmlFor="name">
            Name<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={label.slice(0, -1)}
            className="mt-1 capitalize"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div>
          <Label>Image</Label>
          <div className="mt-1">
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="" className="h-32 rounded object-contain" />
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : existingImage && !removeImage ? (
              <div className="relative inline-block">
                <img src={existingImage} alt="" className="h-32 rounded object-contain" />
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : compressing ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed bg-secondary">
                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Compressing...
                </div>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed bg-secondary text-sm text-muted-foreground hover:border-ring">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5" />
                  Upload Image
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : `Create ${label.slice(0, -1)}`)}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(backUrl)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
