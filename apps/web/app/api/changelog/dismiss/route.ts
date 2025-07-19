import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-session";
import { markChangelogAsDismissed } from "@/lib/redis";

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

    await markChangelogAsDismissed(user.id, version);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing changelog:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}