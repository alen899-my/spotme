import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") || "production";
  const versionCode = searchParams.get("version_code") || "";
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  try {
    const query = new URLSearchParams({ channel });
    if (versionCode) query.set("version_code", versionCode);

    const res = await fetch(`${base}/updates/latest?${query.toString()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { update_available: false, force_update: false, build: null },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.warn("Next.js /api/updates/latest proxy error:", err.message);
    return NextResponse.json(
      { update_available: false, force_update: false, build: null, error: err.message },
      { status: 500 }
    );
  }
}
