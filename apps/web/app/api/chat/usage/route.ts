import { getRequiredUser } from "@/lib/auth-session";
import { getChatUsage } from "@/lib/chat/check-chat-limits";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getRequiredUser();
  const usage = await getChatUsage(user.id);

  return NextResponse.json(usage);
}
