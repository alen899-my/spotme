"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Activity,
  BarChart3,
  MessageSquare,
  Dumbbell,
  Layers,
  FolderOpen,
  Package,
  Crosshair,
  GitBranch,
  ListTree,
  Image as ImageIcon,
  RefreshCw,
  Smartphone,
  Utensils,
  Camera,
  Bell,
  Flame,
  Compass,
  CalendarCheck,
  Bot,
  Sliders,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/nutrition", label: "Nutrition & Meals", icon: Utensils },
  { href: "/dashboard/physique", label: "Physique Moderation", icon: Camera },
  { href: "/dashboard/notifications", label: "Push Campaigns", icon: Bell },
  { href: "/dashboard/workouts", label: "Live Workouts & PRs", icon: Flame },
  { href: "/dashboard/onboarding", label: "Onboarding Funnel", icon: Compass },
  { href: "/dashboard/habits", label: "Habits & Retention", icon: CalendarCheck },
  { href: "/dashboard/gamification", label: "Gamification & XP", icon: Trophy },
  { href: "/dashboard/ai", label: "AI Intelligence", icon: Bot },
  { href: "/dashboard/remote-config", label: "Remote Config", icon: Sliders },
  { href: "/dashboard/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/dashboard/analytics", label: "Analytics & APM", icon: BarChart3 },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/dashboard/workout-splits", label: "Workout Splits", icon: Activity },
  { href: "/dashboard/images", label: "Image Vault", icon: ImageIcon },
  { href: "/dashboard/file-replacer", label: "File Replacer", icon: RefreshCw },
  { href: "/dashboard/builds", label: "App Builds", icon: Smartphone },
]

const libraryItems = [
  { href: "/dashboard/categories", label: "Categories", icon: Layers },
  { href: "/dashboard/body-parts", label: "Body Parts", icon: FolderOpen },
  { href: "/dashboard/equipment", label: "Equipment", icon: Package },
  { href: "/dashboard/targets", label: "Targets", icon: Crosshair },
  { href: "/dashboard/muscle-groups", label: "Muscle Groups", icon: GitBranch },
  { href: "/dashboard/secondary-muscles", label: "Secondary Muscles", icon: ListTree },
]

const generalItems = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    document.cookie = "admin_token=; path=/; max-age=0"
    window.location.href = "/login"
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-60 shrink-0 flex-col border-r bg-card transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <span className="text-lg font-black tracking-tight text-foreground">spot</span>
          <span className="text-lg font-black tracking-tight" style={{ color: "#F7CB16" }}>ME</span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          <div className="px-3 pb-1 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
          </div>
          <nav className="px-2">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-3 pb-1 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Library
            </p>
          </div>
          <nav className="px-2">
            {libraryItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-3 pb-1 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              General
            </p>
          </div>
          <nav className="px-2">
            {generalItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
