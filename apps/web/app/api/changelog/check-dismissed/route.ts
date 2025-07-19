import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-session";
import { isChangelogDismissed } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { version } = await request.json();
    if (!version) {
      return NextResponse.json({ error: "Version is required" }, { status: 400 });
    }

    const isDismissed = await isChangelogDismissed(user.id, version);
    
    return NextResponse.json({ isDismissed });
  } catch (error) {
    console.error("Error checking changelog dismissal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}