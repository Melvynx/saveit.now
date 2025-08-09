import { getRequiredUser } from "@/lib/auth-session";
import { inngest } from "@/lib/inngest/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequiredUser();

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { subject, subheadline, markdown } = await request.json();

    if (!subject?.trim() || !subheadline?.trim() || !markdown?.trim()) {
      return NextResponse.json(
        { error: "Subject, subheadline, and markdown are required" },
        { status: 400 }
      );
    }

    await inngest.send({
      name: "marketing/batch-email",
      data: {
        subject: subject.trim(),
        subheadline: subheadline.trim(),
        markdown: markdown.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send batch email:", error);
    return NextResponse.json(
      { error: "Failed to start email campaign" },
      { status: 500 }
    );
  }
}