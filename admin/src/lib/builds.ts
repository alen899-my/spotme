export interface AppBuild {
  id: number;
  title: string;
  description?: string | null;
  build_channel: string;
  file_type: string;
  version?: string | null;
  version_code?: number | null;
  file_key?: string | null;
  file_url: string;
  file_size?: number | string | null;
  is_latest: boolean;
  force_update: boolean;
  created_at: string;
}

export interface LatestUpdateResponse {
  update_available: boolean;
  force_update: boolean;
  build: AppBuild | null;
}

export const FALLBACK_APK_URL =
  "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/builds/1789875707389_g09z6.apk";

export const FALLBACK_APK_FILENAME = "spotme-latest.apk";

/**
 * Server-side fetch of the latest APK build for a channel (defaults to "production").
 * Dynamic (no-store); never throws — returns null if the API is unreachable.
 */
export async function getLatestApkBuild(channel = "production"): Promise<AppBuild | null> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  try {
    const res = await fetch(`${base}/updates/latest?channel=${encodeURIComponent(channel)}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) return null;
    const data: LatestUpdateResponse = await res.json();
    return data?.build ?? null;
  } catch (err) {
    console.warn("getLatestApkBuild fetch error:", err);
    return null;
  }
}

/**
 * Convenience helper to get the latest APK URL directly, with automatic fallback.
 */
export async function getLatestApkUrl(channel = "production"): Promise<string> {
  const build = await getLatestApkBuild(channel);
  return build?.file_url || FALLBACK_APK_URL;
}
