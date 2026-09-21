import type { Metadata } from "next";
import { AppHeader } from "@/components/landing/app-header";
import { HeroSection } from "@/components/landing/hero-section";
import { PlatformDownloadStrip } from "@/components/landing/platform-download-strip";
import { BentoGrid } from "@/components/landing/bento-grid";
import { CommunitySection } from "@/components/landing/community-section";
import { SmartFeaturesSection } from "@/components/landing/smart-features-section";
import { MeetTeamCtaSection } from "@/components/landing/meet-team-cta";
import { AppFooter } from "@/components/landing/app-footer";
import { FloatingDownloadBar } from "@/components/landing/floating-download-bar";
import { getSiteImageMap } from "@/lib/site-images";

export const metadata: Metadata = {
  title: "SpotMe — A Healthier, Stronger You | Complete Fitness Companion",
  description:
    "SpotMe is your complete fitness companion. Track workouts, log meals, monitor body metrics, and build consistency — all in one place.",
};

// Force dynamic rendering on every request so site image changes go live immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const srcMap = await getSiteImageMap();
  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 selection:bg-[#F7CB16]/30 selection:text-neutral-900 dark:selection:text-white transition-colors duration-300">
      {/* Sticky Responsive Header */}
      <AppHeader />

      {/* Main Landing Flow */}
      <main>
        {/* Hero Section with 5-Device Stack & Alternating Fan-Out */}
        <HeroSection srcMap={srcMap} />

        {/* Cross-Platform: Native Android APK & Web Companion */}
        <PlatformDownloadStrip />

        {/* Authentic Bento Grid with Expo App Assets */}
        <BentoGrid srcMap={srcMap} />

        {/* Phase 3: Friendly Competition & Leaderboard */}
        <CommunitySection />

        {/* Phase 4: Everyday Convenience & Smart Tools */}
        <SmartFeaturesSection srcMap={srcMap} />

        {/* Phase 5: Meet the Team & Community Feedback CTA */}
        <MeetTeamCtaSection srcMap={srcMap} />

        <div id="faq" className="scroll-mt-24" />
      </main>

      {/* Minimal Footer with Background Image */}
      <AppFooter />

      {/* Floating Download & Web App Bar */}
      <FloatingDownloadBar />
    </div>
  );
}
