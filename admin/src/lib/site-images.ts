export interface SiteImageItem {
  slug: string;
  section: "hero" | "bento" | "smart" | "team" | string;
  title: string;
  url: string;
  fallback: string;
  isCustom: boolean;
  alt?: string | null;
  updated_at?: string | null;
}

const R2_SEED_BASE =
  "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/site-images";

// Local public/ files were removed after migrating to R2 — fallbacks point at
// the seeded R2 objects so the landing never 404s, even if the API is down.
export const SITE_IMAGE_FALLBACKS: Record<string, string> = {
  "hero-frame-1": `${R2_SEED_BASE}/seed-hero-frame-1.webp`,
  "hero-frame-2": `${R2_SEED_BASE}/seed-hero-frame-2.webp`,
  "hero-frame-3": `${R2_SEED_BASE}/seed-hero-frame-3.webp`,
  "hero-frame-4": `${R2_SEED_BASE}/seed-hero-frame-4.webp`,
  "hero-frame-5": `${R2_SEED_BASE}/seed-hero-frame-5.webp`,
  "bento-exercises": `${R2_SEED_BASE}/seed-bento-exercises.webp`,
  "bento-splits": `${R2_SEED_BASE}/seed-bento-splits.webp`,
  "bento-workoutlog": `${R2_SEED_BASE}/seed-bento-workoutlog.webp`,
  "bento-foodlog": `${R2_SEED_BASE}/seed-bento-foodlog.webp`,
  "bento-weight": `${R2_SEED_BASE}/seed-bento-weight.webp`,
  "bento-reports": `${R2_SEED_BASE}/seed-bento-reports.webp`,
  "bento-calendar": `${R2_SEED_BASE}/seed-bento-calendar.webp`,
  "bento-following": `${R2_SEED_BASE}/seed-bento-following.webp`,
  "smart-meal-scan": `${R2_SEED_BASE}/seed-smart-meal-scan.webp`,
  "smart-physique-scan": `${R2_SEED_BASE}/seed-smart-physique-scan.webp`,
  "team-cheer": `${R2_SEED_BASE}/seed-team-cheer.webp`,
};

export function resolveSiteImage(map: Record<string, string> | undefined, slug: string): string {
  if (map && map[slug]) return map[slug];
  return SITE_IMAGE_FALLBACKS[slug] ?? "";
}

/**
 * Server-side fetch of the public site-images map.
 * ISR-cached for 1h; never throws — returns {} so callers fall back to R2 seed URLs.
 */
export async function getSiteImageMap(): Promise<Record<string, string>> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  try {
    const res = await fetch(`${base}/site-images`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const data = await res.json();
    return (data?.map ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}
