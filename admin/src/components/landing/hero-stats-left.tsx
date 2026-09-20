import { Star } from "lucide-react"

export function HeroStatsLeft() {
  return (
    <div className="flex flex-col space-y-4 text-left">
      {/* Stat 1 */}
      <div>
        <div className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          50K+
        </div>
        <div className="text-xs font-medium text-neutral-500 sm:text-sm">
          Active Users
        </div>
      </div>

      <div className="h-px w-10 bg-neutral-300" />

      {/* Stat 2 */}
      <div>
        <div className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          1,300+
        </div>
        <div className="text-xs font-medium text-neutral-500 sm:text-sm">
          Exercises
        </div>
      </div>

      <div className="h-px w-10 bg-neutral-300" />

      {/* Stat 3 */}
      <div>
        <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          4.8
          <Star className="h-5 w-5 fill-[#F7CB16] text-[#F7CB16]" />
        </div>
        <div className="text-xs font-medium text-neutral-500 sm:text-sm">
          App Rating
        </div>
      </div>
    </div>
  )
}
