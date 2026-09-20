export function HeroBadge() {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-neutral-200/80 bg-neutral-100/70 px-4 py-1.5 shadow-sm backdrop-blur-sm transition-all hover:bg-neutral-150">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
      </span>
      <span className="text-[11px] font-semibold tracking-[0.2em] text-neutral-600 sm:text-xs">
        TRAIN &nbsp; TRACK &nbsp; IMPROVE &nbsp; TOGETHER
      </span>
    </div>
  )
}
