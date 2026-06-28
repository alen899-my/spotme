"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSelect } from "@/components/ui/form-select"
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { compressImage, createFilePreview } from "@/lib/compress-image"

const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  body_part: z.string().optional(),
  equipment: z.string().optional(),
  target: z.string().optional(),
  muscle_group: z.string().optional(),
  secondary_muscles: z.string().optional(),
  instructions_en: z.string().optional(),
})

type ExerciseFormData = z.infer<typeof exerciseSchema>

interface FilterOptions {
  categories: string[]
  body_parts: string[]
  equipment: string[]
  targets: string[]
  muscle_groups: string[]
}

const dropdownFields: {
  key: keyof ExerciseFormData
  label: string
  optionsKey: keyof FilterOptions
}[] = [
  { key: "category", label: "Category", optionsKey: "categories" },
  { key: "body_part", label: "Body Part", optionsKey: "body_parts" },
  { key: "equipment", label: "Equipment", optionsKey: "equipment" },
  { key: "target", label: "Target Muscle", optionsKey: "targets" },
  { key: "muscle_group", label: "Muscle Group", optionsKey: "muscle_groups" },
  { key: "secondary_muscles", label: "Secondary Muscles", optionsKey: "muscle_groups" },
]

export default function EditExercisePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState<ExerciseFormData>({
    name: "", category: "", body_part: "", equipment: "",
    target: "", muscle_group: "", secondary_muscles: "", instructions_en: "",
  })
  const [options, setOptions] = useState<FilterOptions>({
    categories: [], body_parts: [], equipment: [], targets: [], muscle_groups: [],
  })
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [existingGif, setExistingGif] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [removeGif, setRemoveGif] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [gifFile, setGifFile] = useState<File | null>(null)
  const [gifPreview, setGifPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState<"image" | "gif" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/exercises/meta/filters"),
      api.get(`/exercises/${id}`),
    ]).then(([filtersRes, exerciseRes]) => {
      setOptions({
        categories: filtersRes.data.categories ?? [],
        body_parts: filtersRes.data.body_parts ?? [],
        equipment: filtersRes.data.equipment ?? [],
        targets: filtersRes.data.targets ?? [],
        muscle_groups: filtersRes.data.muscle_groups ?? [],
      })

      const ex = exerciseRes.data
      setForm({
        name: ex.name ?? "",
        category: ex.category ?? "",
        body_part: ex.body_part ?? "",
        equipment: ex.equipment ?? "",
        target: ex.target ?? "",
        muscle_group: ex.muscle_group ?? "",
        secondary_muscles: Array.isArray(ex.secondary_muscles)
          ? ex.secondary_muscles.join(", ")
          : (ex.secondary_muscles ?? ""),
        instructions_en: ex.instructions_en ?? "",
      })
      setExistingImage(ex.image_url ?? null)
      setExistingGif(ex.gif_url ?? null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const update = (key: keyof ExerciseFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleFileSelect = async (file: File | null, type: "image" | "gif") => {
    if (!file) {
      if (type === "image") { setImageFile(null); setImagePreview(null); setRemoveImage(true) }
      else { setGifFile(null); setGifPreview(null); setRemoveGif(true) }
      return
    }
    if (type === "gif") {
      setGifFile(file)
      setGifPreview(createFilePreview(file))
      setRemoveGif(false)
      return
    }
    setCompressing("image")
    try {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setImagePreview(createFilePreview(compressed))
      setRemoveImage(false)
    } catch {
      setImageFile(file)
      setImagePreview(createFilePreview(file))
    } finally {
      setCompressing(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = exerciseSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        fd.append(key, value)
      })
      if (imageFile) fd.append("image", imageFile)
      else if (removeImage) fd.append("remove_image", "1")
      if (gifFile) fd.append("gif", gifFile)
      else if (removeGif) fd.append("remove_gif", "1")

      await api.put(`/admin/exercises/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      router.push("/dashboard/exercises")
    } catch {
      setErrors({ name: "Failed to update exercise. Please try again." })
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
          href="/dashboard/exercises"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Edit Exercise</h1>
          <p className="text-sm text-muted-foreground">#{id} &middot; Update exercise details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">
              Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Bench Press"
              className="mt-1"
            />
            {errors.name && !errors.name.includes("Failed") && (
              <p className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {dropdownFields.map((field) => (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <div className="mt-1">
                <FormSelect
                  label={field.label}
                  items={options[field.optionsKey]}
                  value={form[field.key]}
                  onChange={(v) => update(field.key, v)}
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor="instructions_en">Instructions</Label>
          <textarea
            id="instructions_en"
            value={form.instructions_en}
            onChange={(e) => update("instructions_en", e.target.value)}
            placeholder="Step-by-step instructions..."
            rows={5}
            className="mt-1 w-full rounded-md border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Image</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="" className="h-32 rounded object-contain" />
                  <button
                    type="button"
                    onClick={() => handleFileSelect(null, "image")}
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
                    onClick={() => handleFileSelect(null, "image")}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : compressing === "image" ? (
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
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, "image")}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>GIF</Label>
            <div className="mt-1">
              {gifPreview ? (
                <div className="relative inline-block">
                  <img src={gifPreview} alt="" className="h-32 rounded object-contain" />
                  <button
                    type="button"
                    onClick={() => handleFileSelect(null, "gif")}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : existingGif && !removeGif ? (
                <div className="relative inline-block">
                  <img src={existingGif} alt="" className="h-32 rounded object-contain" />
                  <button
                    type="button"
                    onClick={() => handleFileSelect(null, "gif")}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed bg-secondary text-sm text-muted-foreground hover:border-ring">
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5" />
                    Upload GIF
                  </div>
                  <input
                    type="file"
                    accept="image/gif,image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null, "gif")}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/exercises")}
          >
            Cancel
          </Button>
        </div>

        {errors.name?.includes("Failed") && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </form>
    </div>
  )
}
