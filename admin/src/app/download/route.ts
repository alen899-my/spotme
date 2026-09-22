import { NextResponse } from "next/server";
import { getLatestApkUrl, FALLBACK_APK_URL } from "@/lib/builds";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apkUrl = await getLatestApkUrl("production");
    return NextResponse.redirect(apkUrl || FALLBACK_APK_URL, { status: 307 });
  } catch (err: any) {
    console.warn("Direct /download redirect error, falling back:", err);
    return NextResponse.redirect(FALLBACK_APK_URL, { status: 307 });
  }
}
