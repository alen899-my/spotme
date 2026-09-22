"use client"

import Image from "next/image"
import {
  Shield,
  ShieldCheck,
  Trophy,
  Gem,
  Sparkles,
  Crown,
  Medal,
  Swords,
  Flame,
  Star,
} from "lucide-react"

// ─── Exact League Tiers from SpotMe Mobile App Screen ─────────────────────────
export interface LeagueTierConfig {
  name: string
  color: string
  gradient: [string, string]
  icon: any
  points: string
  desc: string
}

export const APP_TIERS: LeagueTierConfig[] = [
  {
    name: "Bronze",
    color: "#CD7F32",
    gradient: ["#CD7F32", "#8B4513"],
    icon: Shield,
    points: "0 - 1k",
    desc: "Starting tier. Learn the basics and build weekly consistency.",
  },
  {
    name: "Silver",
    color: "#94A3B8",
    gradient: ["#C0C0C0", "#808080"],
    icon: ShieldCheck,
    points: "1k - 3k",
    desc: "Stepping up. Logging workouts and getting regular achievements.",
  },
  {
    name: "Gold",
    color: "#F7CB16",
    gradient: ["#FFD700", "#B8860B"],
    icon: Trophy,
    points: "3k - 6k",
    desc: "Consistency is showing. Highly active athletes with regular streaks.",
  },
  {
    name: "Platinum",
    color: "#06B6D4",
    gradient: ["#00C9C8", "#007BFF"],
    icon: Gem,
    points: "6k - 10k",
    desc: "Advanced status. Crushing limits and setting heavy volume records.",
  },
  {
    name: "Diamond",
    color: "#0284C7",
    gradient: ["#B9F2FF", "#00BFFF"],
    icon: Sparkles,
    points: "10k - 15k",
    desc: "Elite bracket. Dedication to physical metrics, meals, and daily logging.",
  },
  {
    name: "Master",
    color: "#9B59B6",
    gradient: ["#9B59B6", "#6C3483"],
    icon: Crown,
    points: "15k - 22k",
    desc: "True master. Unstoppable workout streak and optimized health goals.",
  },
  {
    name: "Grandmaster",
    color: "#E91E63",
    gradient: ["#E91E63", "#880E4F"],
    icon: Medal,
    points: "22k - 30k",
    desc: "Gym royalty. Inspiring the community and maintaining high intensity.",
  },
  {
    name: "Elite",
    color: "#EA580C",
    gradient: ["#FF5722", "#BF360C"],
    icon: Swords,
    points: "30k - 40k",
    desc: "God-tier discipline. You never miss workouts and push absolute limits.",
  },
  {
    name: "Champion",
    color: "#DC2626",
    gradient: ["#E00000", "#7F0000"],
    icon: Flame,
    points: "40k - 55k",
    desc: "Uncontested champion. Reaching the peak of absolute athleticism.",
  },
  {
    name: "Legend",
    color: "#D97706",
    gradient: ["#FF9900", "#E00000"],
    icon: Star,
    points: "55k+",
    desc: "Ascended legend. Recognized as an icon of peak performance.",
  },
]

export function getTier(name: string): LeagueTierConfig {
  return APP_TIERS.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? APP_TIERS[0]
}

// ─── Circular Gradient League Badge (Exact Mobile App Screen Asset) ───────────
export function LeagueBadge({ tierName, size = 16 }: { tierName: string; size?: number }) {
  const tier = getTier(tierName)
  const Icon = tier.icon
  const outerSize = size + 8

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full shadow-2xs select-none ring-1 ring-black/10 dark:ring-white/15"
      style={{
        width: outerSize,
        height: outerSize,
        background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
      }}
      title={`${tier.name} League`}
    >
      <Icon
        className="drop-shadow-xs"
        style={{
          width: size,
          height: size,
          color: "#FFFFFF",
        }}
      />
    </div>
  )
}

// ─── 10 Curated Athletes with League-Colored Glass Styling ─────────────────────
export interface LeaderboardAthlete {
  rank: number
  name: string
  handle: string
  initials: string
  avatar: string
  tier: string
  streakWeeks: number
  pointsDisplay: string
  cardBg: string
  nameColor: string
  handleColor: string
  hubClass: string
  badgeClass: string
  pointsColor: string
  streakColor: string
  isDarkTheme?: boolean
  isYou?: boolean
}

export const LEADERBOARD_10: LeaderboardAthlete[] = [
  {
    rank: 1,
    name: "Alex Mercer",
    handle: "@alexmercer",
    initials: "AM",
    avatar: "/images/avatars/alex.jpg",
    tier: "Legend",
    streakWeeks: 12,
    pointsDisplay: "3,420 pts",
    cardBg: "bg-red-600 dark:bg-red-700 border-red-500 hover:bg-red-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-red-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 2,
    name: "Marcus Kane",
    handle: "@marcusk",
    initials: "MK",
    avatar: "/images/avatars/marcus.jpg",
    tier: "Champion",
    streakWeeks: 9,
    pointsDisplay: "3,150 pts",
    cardBg: "bg-blue-600 dark:bg-blue-700 border-blue-500 hover:bg-blue-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-blue-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 3,
    name: "Sarah Chen",
    handle: "@sarahc",
    initials: "SC",
    avatar: "/images/avatars/sarah.jpg",
    tier: "Elite",
    streakWeeks: 16,
    pointsDisplay: "2,890 pts",
    cardBg: "bg-[#F7CB16] dark:bg-[#F7CB16] border-amber-400 hover:bg-[#e5bc14] shadow-md",
    nameColor: "text-neutral-950 font-black",
    handleColor: "text-neutral-800",
    hubClass: "bg-neutral-950 text-white",
    badgeClass: "bg-black/15 border border-black/20 text-neutral-950 font-bold",
    pointsColor: "text-neutral-950",
    streakColor: "text-neutral-900",
    isDarkTheme: false,
  },
  {
    rank: 4,
    name: "David Miller",
    handle: "@dmiller",
    initials: "DM",
    avatar: "/images/avatars/david.jpg",
    tier: "Grandmaster",
    streakWeeks: 7,
    pointsDisplay: "2,410 pts",
    cardBg: "bg-emerald-600 dark:bg-emerald-700 border-emerald-500 hover:bg-emerald-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-emerald-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 5,
    name: "Elena Rostova",
    handle: "@erostova",
    initials: "ER",
    avatar: "/images/avatars/elena.jpg",
    tier: "Master",
    streakWeeks: 8,
    pointsDisplay: "1,980 pts",
    cardBg: "bg-slate-200 dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 hover:bg-slate-300 dark:hover:bg-neutral-700 shadow-md",
    nameColor: "text-neutral-900 dark:text-white",
    handleColor: "text-neutral-600 dark:text-neutral-300",
    hubClass: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950",
    badgeClass: "bg-white/80 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white",
    pointsColor: "text-neutral-900 dark:text-white",
    streakColor: "text-amber-600 dark:text-amber-400",
    isDarkTheme: false,
  },
  {
    rank: 6,
    name: "Liam Vance",
    handle: "@liamv",
    initials: "LV",
    avatar: "/images/avatars/liam.jpg",
    tier: "Diamond",
    streakWeeks: 5,
    pointsDisplay: "1,740 pts",
    cardBg: "bg-rose-600 dark:bg-rose-700 border-rose-500 hover:bg-rose-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-rose-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 7,
    name: "Alen Johnson",
    handle: "@alenj",
    initials: "AJ",
    avatar: "/images/avatars/alen.jpg",
    tier: "Platinum",
    streakWeeks: 6,
    pointsDisplay: "1,520 pts",
    cardBg: "bg-[#F7CB16] dark:bg-[#F7CB16] border-2 border-neutral-950 dark:border-white hover:bg-[#e5bc14] shadow-xl ring-2 ring-neutral-950/20 dark:ring-white/20",
    nameColor: "text-neutral-950 font-black",
    handleColor: "text-neutral-800",
    hubClass: "bg-neutral-950 text-white font-black",
    badgeClass: "bg-black/20 border border-black/25 text-neutral-950 font-black",
    pointsColor: "text-neutral-950",
    streakColor: "text-neutral-900",
    isDarkTheme: false,
    isYou: true,
  },
  {
    rank: 8,
    name: "Maya Lin",
    handle: "@mayalin",
    initials: "ML",
    avatar: "/images/avatars/maya.jpg",
    tier: "Gold",
    streakWeeks: 4,
    pointsDisplay: "1,350 pts",
    cardBg: "bg-sky-600 dark:bg-sky-700 border-sky-500 hover:bg-sky-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-sky-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 9,
    name: "Chris Taylor",
    handle: "@christaylor",
    initials: "CT",
    avatar: "/images/avatars/chris.jpg",
    tier: "Silver",
    streakWeeks: 3,
    pointsDisplay: "1,180 pts",
    cardBg: "bg-teal-600 dark:bg-teal-700 border-teal-500 hover:bg-teal-700 shadow-md",
    nameColor: "text-white",
    handleColor: "text-teal-100",
    hubClass: "bg-black/25 text-white border border-white/20",
    badgeClass: "bg-black/25 border border-white/20 text-white",
    pointsColor: "text-white",
    streakColor: "text-white/90",
    isDarkTheme: true,
  },
  {
    rank: 10,
    name: "Jordan Hayes",
    handle: "@jordanh",
    initials: "JH",
    avatar: "/images/avatars/jordan.jpg",
    tier: "Bronze",
    streakWeeks: 2,
    pointsDisplay: "920 pts",
    cardBg: "bg-zinc-200 dark:bg-neutral-800 border-zinc-300 dark:border-neutral-700 hover:bg-zinc-300 dark:hover:bg-neutral-700 shadow-md",
    nameColor: "text-neutral-900 dark:text-white",
    handleColor: "text-neutral-600 dark:text-neutral-400",
    hubClass: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950",
    badgeClass: "bg-white/80 dark:bg-black/40 border border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white",
    pointsColor: "text-neutral-900 dark:text-white",
    streakColor: "text-amber-600 dark:text-amber-400",
    isDarkTheme: false,
  },
]

export function CommunitySection() {
  return (
    <section
      id="community"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 border-t border-neutral-200/90 dark:border-neutral-800/90 overflow-hidden text-neutral-900 dark:text-neutral-100 transition-colors duration-200"
    >
      {/* ── Section Header ── */}
      <div className="relative z-10 max-w-3xl mb-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.12]">
          Turn showing up into a game with friends.
        </h2>
        <p className="mt-3.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
          Real gym effort turns into XP. Log sets, hit volume thresholds, and hold your weekly streak to level up from Bronze to Legend.
        </p>
      </div>

      {/* ── Swipeable Glass League Tier Chips Bar ── */}
      <div className="relative z-10 w-full mb-8">
        <div className="overflow-x-auto no-scrollbar scroll-smooth py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-max pb-1">
            {APP_TIERS.map((t) => (
              <div
                key={t.name}
                className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border select-none bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md text-neutral-800 dark:text-neutral-200 border-neutral-200/90 dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-neutral-300 dark:hover:border-white/20 transition-all"
              >
                {/* Circular Gradient Badge matching App Screen */}
                <LeagueBadge tierName={t.name} size={13} />

                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  {t.name}
                </span>

                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 font-normal">
                  {t.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Solid Olympic Plate Cards Grid (2 Columns, Exactly 10 Athletes) ── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEADERBOARD_10.map((athlete) => {
          const isTop1 = athlete.rank === 1
          const isTop2 = athlete.rank === 2
          const isTop3 = athlete.rank === 3
          const isYou = !!athlete.isYou
          const tier = getTier(athlete.tier)

          return (
            <div
              key={athlete.handle}
              className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-3xl transition-all duration-200 hover:-translate-y-0.5 select-none overflow-hidden border shadow-sm ${athlete.cardBg} ${
                isYou ? "scale-[1.01]" : ""
              }`}
            >
              {/* ── Left Side: Rank Pill + Avatar + Name & Handle ── */}
              <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                {/* Rank Pill */}
                <div className="flex shrink-0 items-center justify-center">
                  {isTop1 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-md font-black text-sm ring-1 ring-white/20">
                      <Trophy className="h-5 w-5 text-[#F7CB16]" />
                    </div>
                  )}
                  {isTop2 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs font-black text-sm bg-black/25 text-white border border-white/25">
                      <Medal className="h-5 w-5" />
                    </div>
                  )}
                  {isTop3 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs font-black text-sm bg-black/25 text-white border border-white/25">
                      <Crown className="h-5 w-5" />
                    </div>
                  )}
                  {!isTop1 && !isTop2 && !isTop3 && (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-2xs font-mono font-bold text-xs ${athlete.hubClass}`}>
                      <span>{athlete.rank < 10 ? `0${athlete.rank}` : athlete.rank}</span>
                    </div>
                  )}
                </div>

                {/* Athlete Avatar */}
                <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden ring-2 ring-white/60 dark:ring-white/30 shadow-sm">
                  <Image
                    src={athlete.avatar}
                    alt={athlete.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>

                {/* Name & Handle */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-extrabold text-base tracking-tight truncate ${athlete.nameColor}`}>
                      {athlete.name}
                    </span>
                    {isYou && (
                      <span className="inline-flex items-center rounded-full bg-neutral-950 text-[#F7CB16] dark:bg-white dark:text-neutral-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className={`text-xs truncate font-medium mt-0.5 block ${athlete.handleColor}`}>
                    {athlete.handle}
                  </span>
                </div>
              </div>

              {/* ── Right Side: League Pill + Points & Streak ── */}
              <div className="relative z-10 flex flex-col items-end gap-2 shrink-0 pl-3">
                {/* League Badge Pill */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${athlete.badgeClass}`}>
                  <LeagueBadge tierName={athlete.tier} size={12} />
                  <span style={{ color: athlete.isDarkTheme ? "#FFFFFF" : tier.color }}>{athlete.tier}</span>
                </div>

                {/* Points & Streak */}
                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 font-bold ${athlete.streakColor}`}>
                    <Flame className="h-3.5 w-3.5 fill-current" />
                    <span>{athlete.streakWeeks}w</span>
                  </span>

                  <span className="opacity-40 font-bold">•</span>

                  <span className={`font-mono font-black text-sm tracking-tight ${athlete.pointsColor}`}>
                    {athlete.pointsDisplay}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
