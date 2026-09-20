import { Dumbbell, Utensils, TrendingUp, Users, Sparkles } from "lucide-react"

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Workouts",
    description: "Log every set, track progress and train with purpose.",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    icon: Utensils,
    title: "Nutrition",
    description: "Track meals and macros with ease.",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
  },
  {
    icon: TrendingUp,
    title: "Progress",
    description: "See real results and visualize your transformation.",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
  },
  {
    icon: Users,
    title: "Community",
    description: "Compete, connect and stay motivated together.",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
  },
  {
    icon: Sparkles,
    title: "AI Coach",
    description: "Get personalized guidance anytime you need.",
    iconColor: "text-sky-500",
    iconBg: "bg-sky-50",
  },
]

export function HeroFeaturesStrip() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-4">
      <div className="rounded-3xl border border-neutral-200/90 bg-white/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-md sm:p-6 lg:p-7">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4 lg:divide-x lg:divide-neutral-150">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`flex items-start gap-3.5 ${
                  index !== 0 ? "lg:pl-5" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor} transition-transform hover:scale-110`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-900">
                    {feature.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-neutral-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
