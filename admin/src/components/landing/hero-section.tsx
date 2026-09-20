import { HeroActions } from "./hero-actions"
import { HeroFramesMockup } from "./hero-frames-mockup"

export function HeroSection({ srcMap }: { srcMap?: Record<string, string> }) {
  return (
    <section id="product" className="relative overflow-hidden bg-gradient-to-b from-white via-neutral-50/40 to-white dark:from-black dark:via-neutral-950 dark:to-black pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-36 lg:pb-32 transition-colors duration-300">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Center Main Headline & CTA Block */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-6xl lg:text-7xl">
            A healthier,
            <br />
            <span className="font-black text-neutral-950 dark:text-neutral-100">stronger </span>
            <span className="font-black" style={{ color: "#F7CB16" }}>
              you.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base md:text-lg">
            SpotMe is your complete fitness companion. Track workouts, log
            meals, monitor body metrics, and build consistency — all in one place.
          </p>

          <div className="mt-8 sm:mt-10">
            <HeroActions />
          </div>
        </div>

        {/* 5-Frame Stacking and Alternating Fan-Out Showcase */}
        <div className="relative mt-8 sm:mt-12">
          <HeroFramesMockup srcMap={srcMap} />
        </div>
      </div>
    </section>
  )
}
