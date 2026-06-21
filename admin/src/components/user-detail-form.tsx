"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import type { User } from "@/types"

interface UserDetailFormProps {
  user?: User
  loading?: boolean
  mode: "view" | "edit"
  onSave?: (data: Partial<User>) => Promise<void>
  onDelete?: () => Promise<void>
  backHref?: string
}

interface FieldDef {
  key: keyof User
  label: string
  type?: string
  editable?: boolean
  section?: string
  render?: (val: any) => React.ReactNode
  options?: { value: string; label: string }[]
}

const fieldDefs: FieldDef[] = [
  { key: "username", label: "Username", editable: true, section: "Account" },
  { key: "role", label: "Role", editable: true, section: "Account", options: [{ value: "admin", label: "Admin" }, { value: "user", label: "User" }, { value: "moderator", label: "Moderator" }] },
  { key: "status", label: "Status", editable: true, section: "Account", options: [{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "inactive", label: "Inactive" }] },
  { key: "plan", label: "Plan", editable: true, section: "Account" },

  { key: "phone", label: "Phone", editable: true, section: "Personal" },
  { key: "gender", label: "Gender", editable: true, section: "Personal", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }] },
  { key: "dob", label: "Date of Birth", editable: true, type: "date", section: "Personal" },
  { key: "age", label: "Age", editable: true, type: "number", section: "Personal" },

  { key: "height", label: "Height", editable: true, section: "Body & Fitness" },
  { key: "weight", label: "Weight", editable: true, section: "Body & Fitness" },
  { key: "body_fat", label: "Body Fat %", editable: true, section: "Body & Fitness" },
  { key: "target_weight", label: "Target Weight", editable: true, section: "Body & Fitness" },
  { key: "fitness_goal", label: "Fitness Goal", editable: true, section: "Body & Fitness" },
  { key: "experience_level", label: "Experience Level", editable: true, section: "Body & Fitness" },
  { key: "activity_level", label: "Activity Level", editable: true, section: "Body & Fitness" },
  { key: "meals_per_day", label: "Meals Per Day", editable: true, type: "number", section: "Body & Fitness" },

  { key: "neck", label: "Neck", editable: true, section: "Measurements" },
  { key: "waist", label: "Waist", editable: true, section: "Measurements" },
  { key: "hip", label: "Hip", editable: true, section: "Measurements" },
  { key: "chest", label: "Chest", editable: true, section: "Measurements" },
  { key: "arm", label: "Arm", editable: true, section: "Measurements" },
  { key: "thigh", label: "Thigh", editable: true, section: "Measurements" },

  { key: "medical_conditions", label: "Medical Conditions", editable: true, section: "Health" },
  { key: "medication", label: "Medication", editable: true, section: "Health" },
  { key: "allergies", label: "Allergies", editable: true, section: "Health" },
  { key: "food_allergies", label: "Food Allergies", editable: true, section: "Health" },
  { key: "diet_type", label: "Diet Type", editable: true, section: "Health" },
  { key: "food_preference", label: "Food Preference", editable: true, section: "Health" },
  { key: "water_intake", label: "Water Intake", editable: true, section: "Health" },

  { key: "is_private", label: "Private Profile", section: "Preferences", render: (v) => v ? "Yes" : "No" },
  { key: "share_splits", label: "Share Splits", section: "Preferences", render: (v) => v ? "Yes" : "No" },
  { key: "water_reminder_enabled", label: "Water Reminder", section: "Preferences", render: (v) => v ? "Enabled" : "Disabled" },
  { key: "water_reminder_interval", label: "Reminder Interval (min)", section: "Preferences" },
  { key: "motivation_enabled", label: "Motivation Messages", section: "Preferences", render: (v) => v ? "Enabled" : "Disabled" },
  { key: "water_goal_date", label: "Water Goal Date", section: "Preferences" },
]

const sectionLabels: Record<string, string> = {
  Account: "Account",
  Personal: "Personal Details",
  "Body & Fitness": "Body & Fitness",
  Measurements: "Body Measurements",
  Health: "Health & Diet",
  Preferences: "Preferences & Settings",
}

export function UserDetailForm({ user, loading, mode, onSave, onDelete, backHref = "/dashboard/users" }: UserDetailFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<Partial<User>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) setForm({ ...user })
  }, [user])

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        User not found.
      </div>
    )
  }

  const isEdit = mode === "edit"

  const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
    active: "success",
    suspended: "warning",
    inactive: "destructive",
  }

  const formatVal = (val: any) => {
    if (val === null || val === undefined || val === "") return "\u2014"
    if (typeof val === "boolean") return val ? "Yes" : "No"
    return String(val)
  }

  const getFieldValue = (fd: FieldDef) => {
    const val = (form as any)[fd.key]
    if (fd.render) return fd.render(val)
    return formatVal(val)
  }

  const sections = [...new Set(fieldDefs.map((f) => f.section).filter(Boolean))] as string[]

  return (
    <div>
      <button
        onClick={() => router.push(backHref)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </button>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant={statusVariant[user.status] ?? "secondary"}>{user.status}</Badge>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <Button onClick={() => router.push(`${backHref}/${user.id}/edit`)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 border-b px-6 py-4 sm:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Joined</Label>
            <p className="mt-0.5 text-sm">{new Date(user.joinedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Last Active</Label>
            <p className="mt-0.5 text-sm">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : "\u2014"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total XP</Label>
            <p className="mt-0.5 text-sm">{user.total_xp?.toLocaleString() ?? "\u2014"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">League Tier</Label>
            <p className="mt-0.5 text-sm capitalize">{user.league_tier ?? "\u2014"}</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 border-b px-6 py-4">
          <div className="rounded-lg border bg-secondary/30 p-3 text-center">
            <p className="text-lg font-semibold">{user.totalWorkouts?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-3 text-center">
            <p className="text-lg font-semibold">{user.totalMeals?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-muted-foreground">Meals</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-3 text-center">
            <p className="text-lg font-semibold">{user.totalWaterLogs?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-muted-foreground">Water Logs</p>
          </div>
        </div>

        {/* Sectioned fields */}
        {sections.map((section) => {
          const sectionFields = fieldDefs.filter((f) => f.section === section)
          return (
            <div key={section} className="border-b px-6 py-4 last:border-b-0">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sectionLabels[section]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sectionFields.map((fd) => (
                  <div key={fd.key}>
                    <Label className="text-xs text-muted-foreground">{fd.label}</Label>
                    {isEdit && fd.editable ? (
                      fd.options ? (
                        <select
                          value={String((form as any)[fd.key] ?? "")}
                          onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })}
                          className="mt-1 block w-full rounded-md border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">\u2014</option>
                          {fd.options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : fd.key === "is_private" || fd.key === "share_splits" || fd.key === "water_reminder_enabled" || fd.key === "motivation_enabled" ? (
                        <select
                          value={(form as any)[fd.key] ? "true" : "false"}
                          onChange={(e) => setForm({ ...form, [fd.key]: e.target.value === "true" })}
                          className="mt-1 block w-full rounded-md border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <Input
                          type={fd.type ?? "text"}
                          value={String((form as any)[fd.key] ?? "")}
                          onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })}
                          className="mt-1"
                        />
                      )
                    ) : (
                      <p className="mt-1 text-sm">{getFieldValue(fd)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Photos section */}
        {(user.front_photo_url || user.back_photo_url || user.side_photo_url) && (
          <div className="px-6 py-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Body Photos
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {user.front_photo_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">Front</Label>
                  <img src={user.front_photo_url} alt="Front" className="mt-1 w-full rounded-lg border object-cover" />
                </div>
              )}
              {user.back_photo_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">Back</Label>
                  <img src={user.back_photo_url} alt="Back" className="mt-1 w-full rounded-lg border object-cover" />
                </div>
              )}
              {user.side_photo_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">Side</Label>
                  <img src={user.side_photo_url} alt="Side" className="mt-1 w-full rounded-lg border object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        {isEdit && onSave && (
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button variant="outline" onClick={() => router.push(`${backHref}/${user.id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              <Save className="mr-1.5 h-4 w-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDelete} onClose={() => setShowDelete(false)}>
        <DialogContent onClose={() => setShowDelete(false)}>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {user.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
