"use client"

/**
 * AI Config Control Center — /dashboard/ai/config
 *
 * Four tabs:
 *  1. Tasks    — assign models per feature, toggle, tune temp/tokens
 *  2. Models   — full catalog, add/disable models
 *  3. Providers — provider registry, API key management
 *  4. Usage    — live audit log + aggregated stats
 */

import React, { useEffect, useState, useCallback } from "react"
import {
  Bot, Cpu, Layers, Zap, Activity,
  ToggleLeft, ToggleRight, Plus, RefreshCw, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, Clock, DollarSign,
  Pencil, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import api from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Provider {
  id: number
  name: string
  display_name: string
  base_url: string
  api_key_masked: string | null
  priority: number
  is_enabled: boolean
}

interface AiModel {
  id: number
  provider_id: number
  model_id: string
  display_name: string
  supports_vision: boolean
  context_window: number | null
  max_output_tokens: number
  input_cost_per_m: number
  output_cost_per_m: number
  rpm_limit: number | null
  rpd_limit: number | null
  is_enabled: boolean
  provider_name: string
  provider_display_name: string
}

interface TaskConfig {
  id: number
  task_key: string
  display_name: string
  description: string
  primary_model_id: number | null
  temperature: number
  max_tokens: number
  is_enabled: boolean
  requires_vision: boolean
  model_id: string | null
  model_display_name: string | null
  provider_name: string | null
  provider_display_name: string | null
}

interface UsageLog {
  id: number
  task_key: string
  user_id: number | null
  provider_name: string
  model_used: string
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  latency_ms: number | null
  cost_usd: number | null
  success: boolean
  error_message: string | null
  created_at: string
}

interface UsageStat {
  task_key: string
  provider_name: string
  total_calls: number
  success_calls: number
  total_tokens: number
  total_cost_usd: number
  avg_latency_ms: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format token counts as 1.2k / 3.4M */
function fmtTokens(n?: number | null) {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/** Format ms latency as "1.23s" or "890ms" */
function fmtMs(ms?: number | null) {
  if (!ms) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

/** Format relative timestamp: "3m ago", "2h ago", "just now" */
function fmtAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Provider badge colors */
const PROVIDER_COLORS: Record<string, string> = {
  gemini: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  openrouter: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  groq: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge showing provider name with color coding */
function ProviderBadge({ name }: { name: string | null }) {
  if (!name) return <span className="text-[10px] text-muted-foreground font-mono">—</span>
  const cls = PROVIDER_COLORS[name] ?? "text-muted-foreground bg-secondary border-border"
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono capitalize ${cls}`}>
      {name}
    </span>
  )
}

/** Enabled/disabled pill */
function StatusPill({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ON
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> OFF
    </span>
  )
}

/** Section header consistent with existing admin style */
function SectionHeader({ icon: Icon, title, sub }: { icon: React.FC<any>; title: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-secondary text-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          Admin Control
        </span>
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────

/**
 * TasksTab — one row per AI feature.
 * Admin can change the assigned model, temperature, max tokens, or toggle off.
 * Changes call PATCH /api/admin/ai/config/tasks/:taskKey and apply immediately.
 */
function TasksTab({ models }: { models: AiModel[] }) {
  const [tasks, setTasks] = useState<TaskConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<TaskConfig | null>(null)
  const [form, setForm] = useState<Partial<TaskConfig>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: TaskConfig[] }>("/admin/ai/config/tasks")
      setTasks(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** Open edit dialog for a task */
  const startEdit = (t: TaskConfig) => {
    setEditingTask(t)
    setForm({ primary_model_id: t.primary_model_id, temperature: t.temperature, max_tokens: t.max_tokens })
  }

  const closeDialog = () => {
    if (saving) return
    setEditingTask(null)
    setForm({})
  }

  /** Save edits — applies immediately, no cache */
  const save = async () => {
    if (!editingTask) return
    setSaving(true)
    try {
      await api.patch(`/admin/ai/config/tasks/${editingTask.task_key}`, form)
      await load()
      setEditingTask(null)
      setForm({})
    } finally {
      setSaving(false)
    }
  }

  /** Toggle is_enabled for a task without opening the dialog */
  const toggle = async (t: TaskConfig) => {
    await api.patch(`/admin/ai/config/tasks/${t.task_key}`, { is_enabled: !t.is_enabled })
    await load()
  }

  if (loading) return <LoadingRow />

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div key={t.task_key} className="rounded-xl border border-border bg-card">
          {/* Row header */}
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{t.display_name}</span>
                <span className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {t.task_key}
                </span>
                {t.requires_vision && (
                  <span className="rounded border border-blue-400/20 bg-blue-400/10 px-1 py-0.5 text-[10px] font-mono text-blue-400">
                    vision
                  </span>
                )}
                <StatusPill enabled={t.is_enabled} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t.description}</p>

              {/* Current assignment summary */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <ProviderBadge name={t.provider_name} />
                <span className="text-[11px] font-mono text-foreground">
                  {t.model_display_name ?? "No model assigned"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  temp:{t.temperature} · {t.max_tokens} tok
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggle(t)}
                title="Toggle enabled"
                className="rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.is_enabled ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
              </button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(t)}>
                Edit
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onClose={closeDialog}>
        <DialogContent onClose={closeDialog}>
          <DialogHeader>
            <DialogTitle>Edit {editingTask?.display_name ?? "Task"}</DialogTitle>
            <DialogDescription className="font-mono text-[11px]">
              {editingTask?.task_key} · changes apply immediately
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">
                  Primary Model
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.primary_model_id ?? ""}
                  onChange={(e) => setForm({ ...form, primary_model_id: e.target.value === "" ? null : Number(e.target.value) })}
                >
                  <option value="">— Select a model —</option>
                  {models
                    .filter((m) => !editingTask.requires_vision || m.supports_vision)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.provider_name}] {m.display_name || m.model_id}
                        {m.supports_vision ? " 👁" : ""}
                      </option>
                    ))}
                </select>
                {editingTask.requires_vision && (
                  <p className="mt-1 text-[10px] text-blue-400 font-mono">Only vision-capable models shown</p>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">
                    Temperature (0–1)
                  </label>
                  <input
                    type="number" step="0.05" min="0" max="1"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.temperature ?? editingTask.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">
                    Max Output Tokens
                  </label>
                  <input
                    type="number" step="256" min="256" max="32768"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.max_tokens ?? editingTask.max_tokens}
                    onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={closeDialog}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab: Models ──────────────────────────────────────────────────────────────

/**
 * ModelsTab — full model catalog with toggle and "Add model" form.
 * Adding a model creates/upserts a row in ai_models.
 */
function ModelsTab({ providers }: { providers: Provider[] }) {
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ provider_id: "", model_id: "", display_name: "", supports_vision: false })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: AiModel[] }>("/admin/ai/config/models")
      setModels(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (m: AiModel) => {
    await api.patch(`/admin/ai/config/models/${m.id}/toggle`, { is_enabled: !m.is_enabled })
    await load()
  }

  const addModel = async () => {
    if (!form.provider_id || !form.model_id) return
    setSaving(true)
    try {
      await api.post("/admin/ai/config/models", form)
      await load()
      setShowAdd(false)
      setForm({ provider_id: "", model_id: "", display_name: "", supports_vision: false })
    } finally {
      setSaving(false)
    }
  }

  const closeAddDialog = () => {
    if (saving) return
    setShowAdd(false)
  }

  if (loading) return <LoadingRow />

  // Group by provider for cleaner display
  const grouped = models.reduce<Record<string, AiModel[]>>((acc, m) => {
    const key = m.provider_display_name
    acc[key] = [...(acc[key] || []), m]
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Add model form */}
      <div className="flex justify-end">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" /> Add Model
        </Button>
      </div>

      {showAdd && (
        <Dialog open={showAdd} onClose={closeAddDialog}>
          <DialogContent onClose={closeAddDialog}>
            <DialogHeader>
              <DialogTitle>Add / Update Model</DialogTitle>
              <DialogDescription>Register a model ID exactly as the provider API expects.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Provider</label>
                <select
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none"
                  value={form.provider_id}
                  onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                >
                  <option value="">— Select provider —</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Model ID (exact API string)</label>
                <input
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
                  placeholder="e.g. gemini-3.1-flash-lite"
                  value={form.model_id}
                  onChange={(e) => setForm({ ...form, model_id: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Display Name</label>
                <input
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none"
                  placeholder="e.g. Gemini 3.1 Flash Lite"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="vision"
                  className="accent-foreground"
                  checked={form.supports_vision}
                  onChange={(e) => setForm({ ...form, supports_vision: e.target.checked })}
                />
                <label htmlFor="vision" className="text-xs text-foreground">Supports Vision (multimodal)</label>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={closeAddDialog}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={addModel} disabled={saving}>
                {saving ? "Saving…" : "Save Model"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Grouped model rows */}
      {Object.entries(grouped).map(([providerName, groupModels]) => (
        <div key={providerName} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{providerName}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{groupModels.length} models</span>
          </div>
          <div className="divide-y divide-border">
            {groupModels.map((m) => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${m.is_enabled ? "" : "opacity-50"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-foreground">{m.model_id}</span>
                    {m.supports_vision && (
                      <span className="rounded border border-blue-400/20 bg-blue-400/10 px-1 py-0.5 text-[10px] font-mono text-blue-400">
                        👁 vision
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 flex-wrap">
                    {m.context_window && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ctx: {fmtTokens(m.context_window)}
                      </span>
                    )}
                    {m.rpm_limit && (
                      <span className="text-[10px] font-mono text-muted-foreground">{m.rpm_limit} RPM</span>
                    )}
                    {m.rpd_limit && (
                      <span className="text-[10px] font-mono text-muted-foreground">{fmtTokens(m.rpd_limit)} RPD</span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ${m.input_cost_per_m}/1M in · ${m.output_cost_per_m}/1M out
                    </span>
                  </div>
                </div>
                <StatusPill enabled={m.is_enabled} />
                <button
                  onClick={() => toggle(m)}
                  className="rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title={m.is_enabled ? "Disable model" : "Enable model"}
                >
                  {m.is_enabled ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Providers ───────────────────────────────────────────────────────────

/**
 * ProvidersTab — shows provider cards with masked API key and toggle.
 * "Add Provider" lets admin register a new LLM provider (Anthropic, OpenAI, etc).
 * Each card has Edit (display_name, base_url, api_key, priority, rename with guard)
 * and Delete (blocked when models still reference the provider).
 */
function ProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [revealed, setRevealed] = useState<number | null>(null) // ID of key currently revealed
  const [form, setForm] = useState({ name: "", display_name: "", base_url: "", api_key: "", priority: 10 })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: "", display_name: "", base_url: "", api_key: "", priority: 10, clearKey: false })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Provider[] }>("/admin/ai/config/providers")
      setProviders(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (p: Provider) => {
    await api.patch(`/admin/ai/config/providers/${p.id}/toggle`, { is_enabled: !p.is_enabled })
    await load()
  }

  const save = async () => {
    if (!form.name || !form.display_name || !form.base_url) return
    setSaving(true)
    try {
      await api.post("/admin/ai/config/providers", form)
      await load()
      setShowAdd(false)
      setForm({ name: "", display_name: "", base_url: "", api_key: "", priority: 10 })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (p: Provider) => {
    setEditingId(p.id)
    setEditError(null)
    setEditForm({ name: p.name, display_name: p.display_name, base_url: p.base_url, api_key: "", priority: p.priority, clearKey: false })
  }

  const closeEditDialog = () => {
    if (editSaving) return
    setEditingId(null)
    setEditError(null)
  }

  const closeAddDialog = () => {
    if (saving) return
    setShowAdd(false)
  }

  const saveEdit = async (id: number) => {
    if (!editForm.display_name.trim() || !editForm.base_url.trim()) {
      setEditError("Display name and Base URL are required.")
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const payload: any = {
        name: editForm.name.trim().toLowerCase(),
        display_name: editForm.display_name.trim(),
        base_url: editForm.base_url.trim(),
        priority: Number(editForm.priority),
      }
      if (editForm.clearKey) payload.clear_api_key = true
      else if (editForm.api_key.trim() !== "") payload.api_key = editForm.api_key.trim()
      await api.patch(`/admin/ai/config/providers/${id}`, payload)
      setEditingId(null)
      await load()
    } catch (e: any) {
      setEditError(e?.response?.data?.message || "Update failed. Check name uniqueness and URL format.")
    } finally {
      setEditSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/admin/ai/config/providers/${deleteTarget.id}`)
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || "Delete failed.")
    } finally {
      setDeleting(false)
    }
  }

  const editingProvider = providers.find((p) => p.id === editingId) ?? null

  if (loading) return <LoadingRow />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAdd(true)}>
          <Plus className="h-3 w-3" /> Add Provider
        </Button>
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onClose={closeAddDialog}>
        <DialogContent onClose={closeAddDialog}>
          <DialogHeader>
            <DialogTitle>Register New Provider</DialogTitle>
            <DialogDescription>Add a new LLM provider endpoint.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: "name", label: "Internal Name (lowercase)", placeholder: "anthropic" },
              { key: "display_name", label: "Display Name", placeholder: "Anthropic" },
              { key: "base_url", label: "Base URL", placeholder: "https://api.anthropic.com/v1" },
              { key: "api_key", label: "API Key", placeholder: "sk-ant-..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">{label}</label>
                <input
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
                  placeholder={placeholder}
                  type={key === "api_key" ? "password" : "text"}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Priority (1 = first tried)</label>
              <input
                type="number" min="1" max="99"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={closeAddDialog}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border border-border bg-card p-4 space-y-3 transition-opacity ${p.is_enabled ? "" : "opacity-60"}`}
          >
            {/* Provider header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{p.display_name}</p>
                <span className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-mono capitalize ${PROVIDER_COLORS[p.name] ?? "text-muted-foreground bg-secondary border-border"}`}>
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(p)} title="Edit provider" className="rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setDeleteTarget(p); setDeleteError(null) }} title="Delete provider" className="rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => toggle(p)} title="Toggle">
                  {p.is_enabled
                    ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                    : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-0.5">Base URL</p>
              <p className="truncate text-[11px] font-mono text-foreground">{p.base_url}</p>
            </div>

            {/* API Key — masked by default, reveal on click */}
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-0.5">API Key</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-[11px] font-mono text-foreground">
                  {revealed === p.id ? p.api_key_masked : (p.api_key_masked ? "●●●●●●●●●●●●" : "Not set")}
                </span>
                {p.api_key_masked && (
                  <button
                    onClick={() => setRevealed(revealed === p.id ? null : p.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Reveal masked key"
                  >
                    {revealed === p.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Priority + Status */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">Priority: {p.priority}</span>
              <StatusPill enabled={p.is_enabled} />
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingProvider} onClose={closeEditDialog}>
        <DialogContent onClose={closeEditDialog}>
          <DialogHeader>
            <DialogTitle>Edit {editingProvider?.display_name ?? "Provider"}</DialogTitle>
            <DialogDescription className="font-mono text-[11px]">
              Blank API key keeps the stored value.
            </DialogDescription>
          </DialogHeader>
          {editError && <p className="text-[11px] font-mono text-red-400">{editError}</p>}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Internal Name (lowercase, unique)</label>
              <input
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Display Name</label>
              <input
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Base URL</label>
              <input
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
                value={editForm.base_url}
                onChange={(e) => setEditForm({ ...editForm, base_url: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">API Key (blank = keep existing)</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
                placeholder={editingProvider?.api_key_masked ? "•••• leave blank to keep ••••" : "sk-..."}
                value={editForm.api_key}
                disabled={editForm.clearKey}
                onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
              />
              <label className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-foreground"
                  checked={editForm.clearKey}
                  onChange={(e) => setEditForm({ ...editForm, clearKey: e.target.checked, api_key: "" })}
                />
                Clear stored key
              </label>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground">Priority (1-99)</label>
              <input
                type="number" min="1" max="99"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:outline-none"
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={closeEditDialog}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => editingId != null && saveEdit(editingId)} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogContent onClose={() => !deleting && setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.display_name}?</DialogTitle>
            <DialogDescription>
              Blocked while models still reference this provider. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-[11px] font-mono text-red-400">{deleteError}</p>}
          <DialogFooter>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab: Usage ───────────────────────────────────────────────────────────────

/**
 * UsageTab — real-time call log with stats summary cards at the top.
 * Fetches aggregated stats and the latest 50 log entries.
 */
function UsageTab() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [stats, setStats] = useState<UsageStat[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("7d")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get<{ data: { logs: UsageLog[]; total: number } }>("/admin/ai/config/usage?limit=50"),
        api.get<{ data: UsageStat[] }>(`/admin/ai/config/usage/stats?period=${period}`),
      ])
      setLogs(logsRes.data.data.logs)
      setStats(statsRes.data.data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  // Totals from stats
  const totalCalls    = stats.reduce((s, r) => s + r.total_calls, 0)
  const totalSuccess  = stats.reduce((s, r) => s + r.success_calls, 0)
  const totalTokens   = stats.reduce((s, r) => s + Number(r.total_tokens || 0), 0)
  const totalCost     = stats.reduce((s, r) => s + Number(r.total_cost_usd || 0), 0)
  const successRate   = totalCalls ? Math.round((totalSuccess / totalCalls) * 100) : 100

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(["today", "7d", "30d", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded border px-2.5 py-1 text-[10px] font-mono transition-colors ${period === p ? "border-foreground bg-foreground text-background" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {p.toUpperCase()}
          </button>
        ))}
        <button onClick={() => load()} className="ml-auto rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Calls",    value: totalCalls.toLocaleString(), icon: Zap,          color: "" },
          { label: "Success Rate",   value: `${successRate}%`,           icon: CheckCircle,  color: successRate >= 95 ? "text-emerald-400" : "text-amber-400" },
          { label: "Total Tokens",   value: fmtTokens(totalTokens),      icon: Activity,     color: "text-sky-400" },
          { label: "Est. Cost (USD)",value: `$${totalCost.toFixed(4)}`,  icon: DollarSign,   color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <p className={`mt-2 text-xl font-bold font-mono ${color || "text-foreground"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-task stats */}
      {stats.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Per-Task Breakdown</span>
          </div>
          <div className="divide-y divide-border">
            {stats.map((s) => (
              <div key={`${s.task_key}-${s.provider_name}`} className="grid grid-cols-5 items-center gap-2 px-4 py-2.5">
                <div className="col-span-2">
                  <p className="text-[11px] font-mono text-foreground">{s.task_key}</p>
                  <ProviderBadge name={s.provider_name} />
                </div>
                <span className="text-[11px] font-mono text-center text-foreground">{s.total_calls}</span>
                <span className="text-[11px] font-mono text-center text-emerald-400">{Math.round((s.success_calls / s.total_calls) * 100)}%</span>
                <span className="text-[11px] font-mono text-right text-muted-foreground">{fmtMs(s.avg_latency_ms)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw log table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Recent Calls</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{logs.length} entries</span>
        </div>
        {loading ? <LoadingRow /> : (
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground font-mono">
                No usage logs yet. AI calls will appear here once they happen.
              </p>
            ) : logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {log.success
                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-foreground">{log.task_key}</span>
                    <ProviderBadge name={log.provider_name} />
                    <span className="text-[10px] font-mono text-muted-foreground">{log.model_used}</span>
                  </div>
                  {log.error_message && (
                    <p className="mt-0.5 text-[10px] text-red-400 font-mono truncate">{log.error_message}</p>
                  )}
                </div>

                {/* Metrics */}
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-mono text-foreground">{fmtTokens(log.total_tokens)} tok</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{fmtMs(log.latency_ms)}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{fmtAgo(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared Loading Row ───────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Activity className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "tasks" | "models" | "providers" | "usage"

const TABS: { key: Tab; label: string; icon: React.FC<any> }[] = [
  { key: "tasks",     label: "Tasks",     icon: Zap },
  { key: "models",    label: "Models",    icon: Cpu },
  { key: "providers", label: "Providers", icon: Layers },
  { key: "usage",     label: "Usage",     icon: Activity },
]

export default function AiConfigPage() {
  const [tab, setTab] = useState<Tab>("tasks")
  const [providers, setProviders] = useState<Provider[]>([])
  const [models, setModels] = useState<AiModel[]>([])

  // Pre-load providers and models once — shared across tabs that need them.
  useEffect(() => {
    api.get<{ data: Provider[] }>("/admin/ai/config/providers").then((r) => setProviders(r.data.data))
    api.get<{ data: AiModel[] }>("/admin/ai/config/models").then((r) => setModels(r.data.data))
  }, [])

  return (
    <div className="space-y-6 pb-12 min-w-0 max-w-full">
      {/* Page Header */}
      <SectionHeader
        icon={Bot}
        title="AI Config Center"
        sub="Control which models power each AI feature. Changes apply immediately — no server restart needed."
      />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-xs font-medium transition-colors ${
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "tasks"     && <TasksTab models={models} />}
      {tab === "models"    && <ModelsTab providers={providers} />}
      {tab === "providers" && <ProvidersTab />}
      {tab === "usage"     && <UsageTab />}
    </div>
  )
}
