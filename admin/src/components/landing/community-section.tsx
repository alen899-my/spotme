"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Shield,
  ShieldAlert,
  Trophy,
  Gem,
  Sparkles,
  Crown,
  Medal,
  Swords,
  Flame,
  Star,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react"

// Exact tiers, gradients, colors, icons, and custom background card color styles
const TIERS = [
  {
    name: "Bronze",
    level: "Tier 1",
    points: "0 - 1,000 pts",
    color: "#CD7F32",
    textDark: false,
    gradient: ["#CD7F32", "#8B4513"],
    bgClass: "bg-[#CD7F32]/25 hover:bg-[#CD7F32]/35",
    icon: Shield,
    desc: "Starting tier for all gym warriors. Learn the basics and build consistency.",
  },
  {
    name: "Silver",
    level: "Tier 2",
    points: "1,000 - 3,000 pts",
    color: "#B0B8C1",
    textDark: true,
    gradient: ["#C0C0C0", "#808080"],
    bgClass: "bg-slate-400/25 hover:bg-slate-400/35",
    icon: ShieldAlert,
    desc: "Stepping up. You are logging workouts and getting standard achievements.",
  },
  {
    name: "Gold",
    level: "Tier 3",
    points: "3,000 - 6,000 pts",
    color: "#F7CB16",
    textDark: true,
    gradient: ["#FFD700", "#B8860B"],
    bgClass: "bg-[#F7CB16]/25 hover:bg-[#F7CB16]/35",
    icon: Trophy,
    desc: "Consistency is showing. Highly active athletes with established streaks.",
  },
  {
    name: "Platinum",
    level: "Tier 4",
    points: "6,000 - 10,000 pts",
    color: "#00C9C8",
    textDark: false,
    gradient: ["#00C9C8", "#007BFF"],
    bgClass: "bg-[#00C9C8]/25 hover:bg-[#00C9C8]/35",
    icon: Gem,
    desc: "Advanced status. You are crushing limits and setting heavy volume records.",
  },
  {
    name: "Diamond",
    level: "Tier 5",
    points: "10,000 - 15,000 pts",
    color: "#7DD4F8",
    textDark: true,
    gradient: ["#B9F2FF", "#00BFFF"],
    bgClass: "bg-[#7DD4F8]/25 hover:bg-[#7DD4F8]/35",
    icon: Sparkles,
    desc: "Elite bracket. Dedication to physical metrics, meals, and daily logging.",
  },
  {
    name: "Master",
    level: "Tier 6",
    points: "15,000 - 22,000 pts",
    color: "#9B59B6",
    textDark: false,
    gradient: ["#9B59B6", "#6C3483"],
    bgClass: "bg-[#9B59B6]/25 hover:bg-[#9B59B6]/35",
    icon: Crown,
    desc: "True master. Unstoppable workout streak and highly optimized health goals.",
  },
  {
    name: "Grandmaster",
    level: "Tier 7",
    points: "22,000 - 30,000 pts",
    color: "#E91E63",
    textDark: false,
    gradient: ["#E91E63", "#880E4F"],
    bgClass: "bg-[#E91E63]/25 hover:bg-[#E91E63]/35",
    icon: Medal,
    desc: "Gym royalty. Inspiring the community and maintaining high intensity volume.",
  },
  {
    name: "Elite",
    level: "Tier 8",
    points: "30,000 - 40,000 pts",
    color: "#FF5722",
    textDark: false,
    gradient: ["#FF5722", "#BF360C"],
    bgClass: "bg-[#FF5722]/25 hover:bg-[#FF5722]/35",
    icon: Swords,
    desc: "God-tier discipline. You never miss workouts and push absolute limits.",
  },
  {
    name: "Champion",
    level: "Tier 9",
    points: "40,000 - 55,000 pts",
    color: "#E00000",
    textDark: false,
    gradient: ["#E00000", "#7F0000"],
    bgClass: "bg-[#E00000]/25 hover:bg-[#E00000]/35",
    icon: Flame,
    desc: "Uncontested champion. Reaching the peak of absolute athleticism.",
  },
  {
    name: "Legend",
    level: "Tier 10",
    points: "55,000+ pts",
    color: "#FF9900",
    textDark: true,
    gradient: ["#FF9900", "#E00000"],
    bgClass: "bg-gradient-to-r from-[#FF9900]/30 to-[#E00000]/30 hover:from-[#FF9900]/40 hover:to-[#E00000]/40 shadow-xs",
    icon: Star,
    desc: "Ascended legend. Recognized as an icon of peak performance and consistency.",
  },
]

interface AthleteRecord {
  rank: number
  initials: string
  name: string
  tier: string
  tierColor: string
  tierGradient: [string, string]
  bgClass: string
  workouts: number
  points: string
  avatar: string
  isYou?: boolean
}

const LEADERBOARD_DATA: Record<"week" | "month" | "allTime", AthleteRecord[]> = {
  week: [
    { rank: 1, initials: "AM", name: "Alex Mercer", tier: "Legend", tierColor: "#FF9900", tierGradient: ["#FF9900", "#E00000"], bgClass: "bg-[#FF9900]/25", workouts: 5, points: "3,420 pts", avatar: "/images/avatars/alex.jpg" },
    { rank: 2, initials: "MK", name: "Marcus Kane", tier: "Champion", tierColor: "#E00000", tierGradient: ["#E00000", "#7F0000"], bgClass: "bg-[#E00000]/25", workouts: 5, points: "3,150 pts", avatar: "/images/avatars/marcus.jpg" },
    { rank: 3, initials: "SC", name: "Sarah Chen", tier: "Elite", tierColor: "#FF5722", tierGradient: ["#FF5722", "#BF360C"], bgClass: "bg-[#FF5722]/25", workouts: 4, points: "2,890 pts", avatar: "/images/avatars/sarah.jpg" },
    { rank: 4, initials: "DM", name: "David Miller", tier: "Grandmaster", tierColor: "#E91E63", tierGradient: ["#E91E63", "#880E4F"], bgClass: "bg-[#E91E63]/20 hover:bg-[#E91E63]/30", workouts: 4, points: "2,410 pts", avatar: "/images/avatars/david.jpg" },
    { rank: 5, initials: "ER", name: "Elena Rostova", tier: "Master", tierColor: "#9B59B6", tierGradient: ["#9B59B6", "#6C3483"], bgClass: "bg-[#9B59B6]/20 hover:bg-[#9B59B6]/30", workouts: 4, points: "1,980 pts", avatar: "/images/avatars/elena.jpg" },
    { rank: 6, initials: "LV", name: "Liam Vance", tier: "Diamond", tierColor: "#7DD4F8", tierGradient: ["#B9F2FF", "#00BFFF"], bgClass: "bg-[#7DD4F8]/20 hover:bg-[#7DD4F8]/30", workouts: 4, points: "1,740 pts", avatar: "/images/avatars/liam.jpg" },
    { rank: 7, initials: "AJ", name: "Alen Johnson", tier: "Platinum", tierColor: "#00C9C8", tierGradient: ["#00C9C8", "#007BFF"], bgClass: "bg-[#00C9C8]/30 ring-1 ring-[#F7CB16]/70 shadow-sm", workouts: 3, points: "1,520 pts", avatar: "/images/avatars/alen.jpg", isYou: true },
    { rank: 8, initials: "ML", name: "Maya Lin", tier: "Gold", tierColor: "#F7CB16", tierGradient: ["#FFD700", "#B8860B"], bgClass: "bg-[#F7CB16]/20 hover:bg-[#F7CB16]/30", workouts: 3, points: "1,350 pts", avatar: "/images/avatars/maya.jpg" },
    { rank: 9, initials: "CT", name: "Chris Taylor", tier: "Silver", tierColor: "#B0B8C1", tierGradient: ["#C0C0C0", "#808080"], bgClass: "bg-slate-400/20 hover:bg-slate-400/30", workouts: 3, points: "1,180 pts", avatar: "/images/avatars/chris.jpg" },
    { rank: 10, initials: "JH", name: "Jordan Hayes", tier: "Bronze", tierColor: "#CD7F32", tierGradient: ["#CD7F32", "#8B4513"], bgClass: "bg-[#CD7F32]/20 hover:bg-[#CD7F32]/30", workouts: 2, points: "920 pts", avatar: "/images/avatars/jordan.jpg" },
  ],
  month: [
    { rank: 1, initials: "MK", name: "Marcus Kane", tier: "Legend", tierColor: "#FF9900", tierGradient: ["#FF9900", "#E00000"], bgClass: "bg-[#FF9900]/25", workouts: 21, points: "14,800 pts", avatar: "/images/avatars/marcus.jpg" },
    { rank: 2, initials: "AM", name: "Alex Mercer", tier: "Legend", tierColor: "#FF9900", tierGradient: ["#FF9900", "#E00000"], bgClass: "bg-[#FF9900]/25", workouts: 20, points: "13,950 pts", avatar: "/images/avatars/alex.jpg" },
    { rank: 3, initials: "DM", name: "David Miller", tier: "Champion", tierColor: "#E00000", tierGradient: ["#E00000", "#7F0000"], bgClass: "bg-[#E00000]/25", workouts: 18, points: "12,400 pts", avatar: "/images/avatars/david.jpg" },
    { rank: 4, initials: "SC", name: "Sarah Chen", tier: "Champion", tierColor: "#E00000", tierGradient: ["#E00000", "#7F0000"], bgClass: "bg-[#E00000]/20 hover:bg-[#E00000]/30", workouts: 17, points: "11,800 pts", avatar: "/images/avatars/sarah.jpg" },
    { rank: 5, initials: "ER", name: "Elena Rostova", tier: "Grandmaster", tierColor: "#E91E63", tierGradient: ["#E91E63", "#880E4F"], bgClass: "bg-[#E91E63]/20 hover:bg-[#E91E63]/30", workouts: 14, points: "8,900 pts", avatar: "/images/avatars/elena.jpg" },
    { rank: 6, initials: "LV", name: "Liam Vance", tier: "Diamond", tierColor: "#7DD4F8", tierGradient: ["#B9F2FF", "#00BFFF"], bgClass: "bg-[#7DD4F8]/20 hover:bg-[#7DD4F8]/30", workouts: 11, points: "6,800 pts", avatar: "/images/avatars/liam.jpg" },
    { rank: 7, initials: "AJ", name: "Alen Johnson", tier: "Master", tierColor: "#9B59B6", tierGradient: ["#9B59B6", "#6C3483"], bgClass: "bg-[#9B59B6]/30 ring-1 ring-[#F7CB16]/70 shadow-sm", workouts: 12, points: "7,450 pts", avatar: "/images/avatars/alen.jpg", isYou: true },
    { rank: 8, initials: "ML", name: "Maya Lin", tier: "Platinum", tierColor: "#00C9C8", tierGradient: ["#00C9C8", "#007BFF"], bgClass: "bg-[#00C9C8]/20 hover:bg-[#00C9C8]/30", workouts: 10, points: "5,600 pts", avatar: "/images/avatars/maya.jpg" },
    { rank: 9, initials: "CT", name: "Chris Taylor", tier: "Gold", tierColor: "#F7CB16", tierGradient: ["#FFD700", "#B8860B"], bgClass: "bg-[#F7CB16]/20 hover:bg-[#F7CB16]/30", workouts: 9, points: "4,900 pts", avatar: "/images/avatars/chris.jpg" },
    { rank: 10, initials: "JH", name: "Jordan Hayes", tier: "Silver", tierColor: "#B0B8C1", tierGradient: ["#C0C0C0", "#808080"], bgClass: "bg-slate-400/20 hover:bg-slate-400/30", workouts: 7, points: "3,650 pts", avatar: "/images/avatars/jordan.jpg" },
  ],
  allTime: [
    { rank: 1, initials: "AM", name: "Alex Mercer", tier: "Legend", tierColor: "#FF9900", tierGradient: ["#FF9900", "#E00000"], bgClass: "bg-[#FF9900]/25", workouts: 184, points: "82,400 pts", avatar: "/images/avatars/alex.jpg" },
    { rank: 2, initials: "MK", name: "Marcus Kane", tier: "Legend", tierColor: "#FF9900", tierGradient: ["#FF9900", "#E00000"], bgClass: "bg-[#FF9900]/25", workouts: 165, points: "76,200 pts", avatar: "/images/avatars/marcus.jpg" },
    { rank: 3, initials: "SC", name: "Sarah Chen", tier: "Champion", tierColor: "#E00000", tierGradient: ["#E00000", "#7F0000"], bgClass: "bg-[#E00000]/25", workouts: 142, points: "64,800 pts", avatar: "/images/avatars/sarah.jpg" },
    { rank: 4, initials: "ER", name: "Elena Rostova", tier: "Champion", tierColor: "#E00000", tierGradient: ["#E00000", "#7F0000"], bgClass: "bg-[#E00000]/20 hover:bg-[#E00000]/30", workouts: 128, points: "58,100 pts", avatar: "/images/avatars/elena.jpg" },
    { rank: 5, initials: "DM", name: "David Miller", tier: "Elite", tierColor: "#FF5722", tierGradient: ["#FF5722", "#BF360C"], bgClass: "bg-[#FF5722]/20 hover:bg-[#FF5722]/30", workouts: 110, points: "49,500 pts", avatar: "/images/avatars/david.jpg" },
    { rank: 6, initials: "LV", name: "Liam Vance", tier: "Master", tierColor: "#9B59B6", tierGradient: ["#9B59B6", "#6C3483"], bgClass: "bg-[#9B59B6]/20 hover:bg-[#9B59B6]/30", workouts: 84, points: "36,800 pts", avatar: "/images/avatars/liam.jpg" },
    { rank: 7, initials: "AJ", name: "Alen Johnson", tier: "Diamond", tierColor: "#7DD4F8", tierGradient: ["#B9F2FF", "#00BFFF"], bgClass: "bg-[#7DD4F8]/30 ring-1 ring-[#F7CB16]/70 shadow-sm", workouts: 76, points: "31,400 pts", avatar: "/images/avatars/alen.jpg", isYou: true },
    { rank: 8, initials: "ML", name: "Maya Lin", tier: "Platinum", tierColor: "#00C9C8", tierGradient: ["#00C9C8", "#007BFF"], bgClass: "bg-[#00C9C8]/20 hover:bg-[#00C9C8]/30", workouts: 68, points: "26,900 pts", avatar: "/images/avatars/maya.jpg" },
    { rank: 9, initials: "CT", name: "Chris Taylor", tier: "Gold", tierColor: "#F7CB16", tierGradient: ["#FFD700", "#B8860B"], bgClass: "bg-[#F7CB16]/20 hover:bg-[#F7CB16]/30", workouts: 55, points: "21,500 pts", avatar: "/images/avatars/chris.jpg" },
    { rank: 10, initials: "JH", name: "Jordan Hayes", tier: "Silver", tierColor: "#B0B8C1", tierGradient: ["#C0C0C0", "#808080"], bgClass: "bg-slate-400/20 hover:bg-slate-400/30", workouts: 42, points: "16,800 pts", avatar: "/images/avatars/jordan.jpg" },
  ],
}

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState<"week" | "month" | "allTime">("week")

  const currentLeaders = LEADERBOARD_DATA[activeTab]

  return (
    <section
      id="community"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-t border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mb-10 sm:mb-14"
      >
        <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
          Friendly Competition
        </span>
        <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Turn showing up into a game with friends.
        </h2>
        <p className="mt-3.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
          Earn points every time you log a workout. Climb through 10 ranks from
          Bronze to Legend, compare weekly streaks, and cheer on friends when they finish a session.
        </p>
      </motion.div>

      {/* Super-Responsive 3-Card Grid with Rich Background Card Colors & No Unnecessary Borders */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 sm:gap-7">
        {/* CARD 1: 10-Tier Rank Ladder — Sleek Black Theme (md: 1 col, xl: 4 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-1 xl:col-span-4 rounded-3xl bg-neutral-950 dark:bg-black p-5 sm:p-7 flex flex-col justify-between shadow-xl text-white"
        >
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">
                10 Rank Tiers
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 dark:bg-white/10 text-white">
                Bronze to Legend
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Climb with every workout.
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Points come directly from your real gym effort: completed sets, total weight lifted, and weekly workout streaks.
            </p>

            {/* Fluid Responsive Tier List with Distinct Tier-Themed Background Colors & Invisible Scroll */}
            <div
              className="mt-5 space-y-2 max-h-[400px] overflow-y-auto no-scrollbar scrollbar-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {TIERS.map((tier) => {
                const Icon = tier.icon
                return (
                  <div
                    key={tier.name}
                    className={`flex items-center justify-between gap-2.5 rounded-xl p-2.5 transition-all backdrop-blur-xs shadow-xs ${tier.bgClass}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {/* Circular Gradient Badge from XP Guide */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs"
                        style={{
                          background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
                        }}
                      >
                        <Icon className="h-4 w-4 text-white drop-shadow-xs" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-xs font-extrabold"
                            style={{ color: tier.color }}
                          >
                            {tier.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium">
                            • {tier.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 leading-snug line-clamp-1">
                          {tier.desc}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-white whitespace-nowrap pl-1 shrink-0">
                      {tier.points}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Streak Note from XP Guide */}
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2.5 text-xs text-neutral-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#F7CB16]">
                <Flame className="h-3.5 w-3.5 fill-[#F7CB16] text-[#F7CB16]" />
              </div>
              <span className="font-semibold leading-tight text-neutral-200">Maintain a 3-week streak to unlock point boosts</span>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: Live Podium & Leaderboard — Solid Indigo Theme (md: 1 col, xl: 5 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-1 xl:col-span-5 rounded-3xl bg-indigo-600 dark:bg-indigo-950 p-5 sm:p-7 flex flex-col justify-between shadow-xl text-white transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            {/* Super Responsive Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-400/30 dark:border-indigo-800/60 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                Gym Leaderboard
              </span>

              {/* Touch-Friendly Tab Selector */}
              <div className="grid grid-cols-3 sm:inline-flex rounded-lg bg-black/40 dark:bg-black/60 p-0.5 text-[11px] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("week")}
                  className={`py-1.5 sm:px-2.5 sm:py-1 rounded-md font-bold text-center transition-colors ${
                    activeTab === "week"
                      ? "bg-white text-indigo-950 shadow-md"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("month")}
                  className={`py-1.5 sm:px-2.5 sm:py-1 rounded-md font-bold text-center transition-colors ${
                    activeTab === "month"
                      ? "bg-white text-indigo-950 shadow-md"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("allTime")}
                  className={`py-1.5 sm:px-2.5 sm:py-1 rounded-md font-bold text-center transition-colors ${
                    activeTab === "allTime"
                      ? "bg-white text-indigo-950 shadow-md"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              See who stayed consistent.
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
              Real rankings based on logged workouts. Compete against friends or check your standing among all athletes.
            </p>

            {/* Top 3 Podium Cards with Solid Translucent Surfaces & No Borders */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 text-center mb-4">
              {/* 2nd Place — Marcus Kane (MK, Champion) */}
              <div className="rounded-2xl bg-white/15 dark:bg-black/40 p-2 sm:p-3 flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold text-indigo-200 uppercase">2nd</span>
                <div className="my-1">
                  <div
                    className="mx-auto relative h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0.5 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${currentLeaders[1].tierGradient[0]}, ${currentLeaders[1].tierGradient[1]})`,
                    }}
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <Image
                        src={currentLeaders[1].avatar}
                        alt={currentLeaders[1].name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    {/* Initials badge rendered in tier color */}
                    <span
                      className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs text-white"
                      style={{
                        background: `linear-gradient(135deg, ${currentLeaders[1].tierGradient[0]}, ${currentLeaders[1].tierGradient[1]})`,
                      }}
                    >
                      {currentLeaders[1].initials}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[11px] sm:text-xs font-bold text-white truncate px-0.5">
                    {currentLeaders[1].name}
                  </h4>
                  <span
                    className="text-[10px] font-mono font-bold block truncate"
                    style={{ color: currentLeaders[1].tierColor }}
                  >
                    {currentLeaders[1].points}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-indigo-200 font-medium truncate">
                  {currentLeaders[1].workouts} w/o
                </span>
              </div>

              {/* 1st Place — Alex Mercer (AM, Legend) — Highlighted Gold Halo */}
              <div className="rounded-2xl bg-white/25 dark:bg-black/60 p-2 sm:p-3 flex flex-col justify-between shadow-xl">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-[#F7CB16] uppercase">
                  <Trophy className="h-3.5 w-3.5" />
                  1st
                </div>
                <div className="my-1">
                  <div
                    className="mx-auto relative h-12 w-12 sm:h-13 sm:w-13 rounded-full p-0.5 shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${currentLeaders[0].tierGradient[0]}, ${currentLeaders[0].tierGradient[1]})`,
                    }}
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <Image
                        src={currentLeaders[0].avatar}
                        alt={currentLeaders[0].name}
                        fill
                        className="object-cover"
                        sizes="52px"
                      />
                    </div>
                    {/* Initials badge rendered in tier color */}
                    <span
                      className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs text-black font-extrabold"
                      style={{
                        background: "#F7CB16",
                      }}
                    >
                      {currentLeaders[0].initials}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[11px] sm:text-xs font-extrabold text-white truncate px-0.5">
                    {currentLeaders[0].name}
                  </h4>
                  <span
                    className="text-[10px] font-mono font-extrabold block truncate text-[#F7CB16]"
                  >
                    {currentLeaders[0].points}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-amber-200 font-bold truncate">
                  {currentLeaders[0].workouts} w/o
                </span>
              </div>

              {/* 3rd Place — Sarah Chen (SC, Elite) */}
              <div className="rounded-2xl bg-white/15 dark:bg-black/40 p-2 sm:p-3 flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold text-indigo-200 uppercase">3rd</span>
                <div className="my-1">
                  <div
                    className="mx-auto relative h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0.5 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${currentLeaders[2].tierGradient[0]}, ${currentLeaders[2].tierGradient[1]})`,
                    }}
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <Image
                        src={currentLeaders[2].avatar}
                        alt={currentLeaders[2].name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    {/* Initials badge rendered in tier color */}
                    <span
                      className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs text-white"
                      style={{
                        background: `linear-gradient(135deg, ${currentLeaders[2].tierGradient[0]}, ${currentLeaders[2].tierGradient[1]})`,
                      }}
                    >
                      {currentLeaders[2].initials}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[11px] sm:text-xs font-bold text-white truncate px-0.5">
                    {currentLeaders[2].name}
                  </h4>
                  <span
                    className="text-[10px] font-mono font-bold block truncate"
                    style={{ color: currentLeaders[2].tierColor }}
                  >
                    {currentLeaders[2].points}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-indigo-200 font-medium truncate">
                  {currentLeaders[2].workouts} w/o
                </span>
              </div>
            </div>

            {/* Full Leaderboard List (Ranks 4 to 10) with Distinct Tier-Themed Card Backgrounds & Invisible Scroll */}
            <div
              className="max-h-[270px] overflow-y-auto no-scrollbar scrollbar-hidden space-y-1.5 pt-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {currentLeaders.slice(3).map((athlete) => (
                <div
                  key={athlete.name}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all shadow-xs ${athlete.bgClass}`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="font-mono text-indigo-200 w-3.5 sm:w-4 shrink-0 text-center font-bold">
                      {athlete.rank}
                    </span>

                    {/* Athlete Avatar with Tier Gradient Border */}
                    <div
                      className="relative h-7 w-7 shrink-0 rounded-full p-0.5 shadow-2xs"
                      style={{
                        background: `linear-gradient(135deg, ${athlete.tierGradient[0]}, ${athlete.tierGradient[1]})`,
                      }}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-full">
                        <Image
                          src={athlete.avatar}
                          alt={athlete.name}
                          fill
                          className="object-cover"
                          sizes="28px"
                        />
                      </div>
                    </div>

                    {/* Tier-Colored Initials Circular Badge */}
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white shadow-2xs"
                      style={{
                        background: `linear-gradient(135deg, ${athlete.tierGradient[0]}, ${athlete.tierGradient[1]})`,
                      }}
                      title={`${athlete.name} (${athlete.initials})`}
                    >
                      {athlete.initials}
                    </span>

                    <span className="font-bold text-white truncate">
                      {athlete.name}
                    </span>
                    {athlete.isYou && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#F7CB16] text-black shrink-0 shadow-2xs">
                        YOU
                      </span>
                    )}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 hidden sm:inline-block shadow-2xs"
                      style={{ backgroundColor: athlete.tierColor }}
                    >
                      {athlete.tier}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-indigo-200 font-medium hidden xs:inline-block">
                      {athlete.workouts} w/o
                    </span>
                    <span className="font-mono font-bold text-white">
                      {athlete.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-indigo-400/30 dark:border-indigo-800/60">
            <span className="text-xs text-indigo-200">
              Rankings refresh automatically every Sunday at midnight
            </span>
          </div>
        </motion.div>

        {/* CARD 3: Accountability & Real Friends Feed — Solid Teal Theme (md: 2 cols, xl: 3 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-2 xl:col-span-3 rounded-3xl bg-teal-700 dark:bg-teal-950 p-5 sm:p-7 flex flex-col justify-between shadow-xl text-white transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-teal-400/30 dark:border-teal-800/60 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-teal-200">
                Partner Feed
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                High Fives
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Cheer your friends on.
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-teal-100 leading-relaxed">
              When a gym partner finishes a tough leg workout or hits a new PR, send them a quick cheer to keep them going.
            </p>

            {/* Cheer Cards with Solid Translucent Surfaces & No White Borders */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              {/* Activity 1: Alex Mercer Workout */}
              <div className="rounded-2xl bg-white/15 dark:bg-black/40 p-3.5 shadow-md transition-all hover:bg-white/20 dark:hover:bg-black/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7 rounded-full overflow-hidden shadow-xs">
                      <Image
                        src="/images/avatars/alex.jpg"
                        alt="Alex Mercer"
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                    <span
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[8px] font-black text-white shadow-2xs"
                      style={{
                        background: "linear-gradient(135deg, #FF9900, #E00000)",
                      }}
                    >
                      AM
                    </span>
                    <span className="font-bold text-white truncate">Alex Mercer</span>
                  </div>
                  <span className="text-[10px] text-teal-200 shrink-0 pl-1 font-medium">2h ago</span>
                </div>
                <p className="text-xs text-teal-100 leading-snug">
                  Crushed Chest & Triceps (5 exercises, 16 sets)
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-200 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Sent High Five</span>
                </div>
              </div>

              {/* Activity 2: Sarah Chen PR */}
              <div className="rounded-2xl bg-white/15 dark:bg-black/40 p-3.5 shadow-md transition-all hover:bg-white/20 dark:hover:bg-black/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7 rounded-full overflow-hidden shadow-xs">
                      <Image
                        src="/images/avatars/sarah.jpg"
                        alt="Sarah Chen"
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                    <span
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[8px] font-black text-white shadow-2xs"
                      style={{
                        background: "linear-gradient(135deg, #FF5722, #BF360C)",
                      }}
                    >
                      SC
                    </span>
                    <span className="font-bold text-white truncate">Sarah Chen</span>
                  </div>
                  <span className="text-[10px] text-teal-200 shrink-0 pl-1 font-medium">4h ago</span>
                </div>
                <p className="text-xs text-teal-100 leading-snug">
                  Hit new Bench Press PR (75 kg x 5 reps)
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/25 text-cyan-200 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Cheered PR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Privacy Card */}
          <div className="mt-6 pt-4 border-t border-teal-400/30 dark:border-teal-800/60">
            <div className="flex items-center justify-between text-xs text-teal-100 rounded-xl bg-white/10 dark:bg-black/40 px-3 py-2 shadow-xs">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Zero ads or spam</span>
              </div>
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                Verified
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

