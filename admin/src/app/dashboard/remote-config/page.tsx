"use client"

import React, { useEffect, useState } from "react"
import {
  Sliders,
  ToggleLeft,
  ToggleRight,
  Save,
  RotateCcw,
  Smartphone,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  ShieldAlert,
  Sparkles,
  Utensils,
  Trophy,
  Droplet,
  Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface FeatureFlags {
  ai_coach_enabled: boolean
  ai_meal_scanner_enabled: boolean
  physique_analysis_enabled: boolean
  community_leaderboard_enabled: boolean
  water_hydration_tracker_enabled: boolean
  strict_maintenance_mode: boolean
}

interface AppVersionPolicy {
  min_supported_ios_version: string
  min_supported_android_version: string
  latest_ios_build: string
  latest_android_build: string
  force_update_prompt: boolean
}

interface MaintenanceWindow {
  headline: string
  message: string
  scheduled_end: string | null
}

interface CacheSettings {
  client_telemetry_interval_sec: number
  leaderboard_cache_ttl_sec: number
}

interface RemoteConfigPayload {
  feature_flags: FeatureFlags
  app_version_policy: AppVersionPolicy
  maintenance_window: MaintenanceWindow
  cache_settings: CacheSettings
}

export default function RemoteConfigPage() {
  const [config, setConfig] = useState<RemoteConfigPayload | null>(null)
  const [originalConfig, setOriginalConfig] = useState<RemoteConfigPayload | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchRemoteConfig = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ config: RemoteConfigPayload; updated_at: string }>(
        "/admin/remote-config"
      )
      setConfig(res.data.config)
      setOriginalConfig(res.data.config)
      setUpdatedAt(res.data.updated_at)
    } catch (err) {
      console.error("Failed to fetch remote config:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRemoteConfig()
  }, [])

  const handleToggleFlag = (key: keyof FeatureFlags) => {
    if (!config) return
    setConfig({
      ...config,
      feature_flags: {
        ...config.feature_flags,
        [key]: !config.feature_flags[key],
      },
    })
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await api.put<{ config: RemoteConfigPayload; updated_at: string }>(
        "/admin/remote-config",
        config
      )
      setConfig(res.data.config)
      setOriginalConfig(res.data.config)
      setUpdatedAt(res.data.updated_at)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to update remote config:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)))
    }
  }

  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig)

  if (loading || !config) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
          Loading remote configuration...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Save Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-secondary text-foreground">
              <Sliders className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Remote Configuration & Feature Flags
            </h1>
            {isDirty && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-500">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Instantly govern mobile client capabilities, manage version enforcement, and trigger maintenance mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={saving}
              className="h-8 text-xs font-mono gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="h-8 text-xs font-mono gap-1.5"
          >
            {saving ? (
              <Activity className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Deploying..." : saveSuccess ? "Deployed" : "Deploy Changes"}
          </Button>
        </div>
      </div>

      {/* SECTION 1: DYNAMIC FEATURE FLAGS */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-foreground">
              Live Client Feature Flags
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            Zero-release OTA toggles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Flag 1: AI Coach */}
          <div
            onClick={() => handleToggleFlag("ai_coach_enabled")}
            className="cursor-pointer rounded-lg border border-border p-3.5 hover:bg-secondary/30 transition-all flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">AI Coach Chat</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Conversational workout & diet advice powered by multi-provider LLM chain.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.ai_coach_enabled
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.ai_coach_enabled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Flag 2: AI Meal Scanner */}
          <div
            onClick={() => handleToggleFlag("ai_meal_scanner_enabled")}
            className="cursor-pointer rounded-lg border border-border p-3.5 hover:bg-secondary/30 transition-all flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">AI Meal Scanner</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Photo food recognition and automatic calorie & macro extraction.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.ai_meal_scanner_enabled
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.ai_meal_scanner_enabled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Flag 3: Physique Analysis */}
          <div
            onClick={() => handleToggleFlag("physique_analysis_enabled")}
            className="cursor-pointer rounded-lg border border-border p-3.5 hover:bg-secondary/30 transition-all flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Physique Scoring</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Body fat estimate, muscle symmetry, and posture audit.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.physique_analysis_enabled
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.physique_analysis_enabled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Flag 4: Community Leaderboards */}
          <div
            onClick={() => handleToggleFlag("community_leaderboard_enabled")}
            className="cursor-pointer rounded-lg border border-border p-3.5 hover:bg-secondary/30 transition-all flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Global Leaderboards</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                PR rankings, XP league tiers, and community athletic leaderboards.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.community_leaderboard_enabled
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.community_leaderboard_enabled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Flag 5: Hydration Tracker */}
          <div
            onClick={() => handleToggleFlag("water_hydration_tracker_enabled")}
            className="cursor-pointer rounded-lg border border-border p-3.5 hover:bg-secondary/30 transition-all flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Hydration Tracker</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Daily ml water tracking, hydration streaks, and intake notifications.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.water_hydration_tracker_enabled
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.water_hydration_tracker_enabled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Flag 6: Strict Maintenance Lockout */}
          <div
            onClick={() => handleToggleFlag("strict_maintenance_mode")}
            className={`cursor-pointer rounded-lg border p-3.5 transition-all flex items-start justify-between gap-3 ${
              config.feature_flags.strict_maintenance_mode
                ? "border-rose-500/40 bg-rose-500/10"
                : "border-border hover:bg-secondary/30"
            }`}
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldAlert
                  className={`h-3.5 w-3.5 shrink-0 ${
                    config.feature_flags.strict_maintenance_mode ? "text-rose-500" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    config.feature_flags.strict_maintenance_mode ? "text-rose-500" : "text-foreground"
                  }`}
                >
                  Strict Maintenance Mode
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Blocks all non-admin client traffic with full-screen lockout banner.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0 font-medium ${
                config.feature_flags.strict_maintenance_mode
                  ? "bg-rose-500 text-white border border-rose-600"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {config.feature_flags.strict_maintenance_mode ? "LOCKED" : "Off"}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: APP VERSION POLICY & MAINTENANCE BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* App Version Enforcement */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-foreground">
                App Version Policy
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              Force update governance
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Min Supported iOS Version
                </label>
                <input
                  type="text"
                  value={config.app_version_policy.min_supported_ios_version}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      app_version_policy: {
                        ...config.app_version_policy,
                        min_supported_ios_version: e.target.value,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Min Supported Android Version
                </label>
                <input
                  type="text"
                  value={config.app_version_policy.min_supported_android_version}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      app_version_policy: {
                        ...config.app_version_policy,
                        min_supported_android_version: e.target.value,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Latest iOS Build
                </label>
                <input
                  type="text"
                  value={config.app_version_policy.latest_ios_build}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      app_version_policy: {
                        ...config.app_version_policy,
                        latest_ios_build: e.target.value,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Latest Android Build
                </label>
                <input
                  type="text"
                  value={config.app_version_policy.latest_android_build}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      app_version_policy: {
                        ...config.app_version_policy,
                        latest_android_build: e.target.value,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div
              onClick={() =>
                setConfig({
                  ...config,
                  app_version_policy: {
                    ...config.app_version_policy,
                    force_update_prompt: !config.app_version_policy.force_update_prompt,
                  },
                })
              }
              className="cursor-pointer rounded-lg border border-border p-3 flex items-center justify-between hover:bg-secondary/20"
            >
              <div>
                <div className="font-semibold text-foreground">Prompt Forced Update Modal</div>
                <div className="text-[11px] text-muted-foreground">
                  Prevent mobile users from proceeding until app is updated from App Store / Play Store.
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                  config.app_version_policy.force_update_prompt
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {config.app_version_policy.force_update_prompt ? "Enforced" : "Optional"}
              </span>
            </div>
          </div>
        </div>

        {/* Maintenance Message Banner */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-foreground">
                Maintenance Window & Announcements
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              User-facing screen
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                Announcement Headline
              </label>
              <input
                type="text"
                value={config.maintenance_window.headline}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    maintenance_window: {
                      ...config.maintenance_window,
                      headline: e.target.value,
                    },
                  })
                }
                className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                Broadcast Maintenance Message
              </label>
              <textarea
                rows={3}
                value={config.maintenance_window.message}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    maintenance_window: {
                      ...config.maintenance_window,
                      message: e.target.value,
                    },
                  })
                }
                className="w-full rounded-md border border-border bg-secondary/40 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Telemetry Frequency (s)
                </label>
                <input
                  type="number"
                  value={config.cache_settings.client_telemetry_interval_sec}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cache_settings: {
                        ...config.cache_settings,
                        client_telemetry_interval_sec: Number(e.target.value) || 30,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Leaderboard Cache (s)
                </label>
                <input
                  type="number"
                  value={config.cache_settings.leaderboard_cache_ttl_sec}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cache_settings: {
                        ...config.cache_settings,
                        leaderboard_cache_ttl_sec: Number(e.target.value) || 300,
                      },
                    })
                  }
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Stamp */}
      {updatedAt && (
        <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-end gap-1.5 pt-2">
          <Clock className="h-3 w-3" />
          <span>Active configuration deployed: {new Date(updatedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
