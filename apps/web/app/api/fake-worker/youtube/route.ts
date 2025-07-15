import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  
  if (!videoId) {
    return NextResponse.json(
      { error: "Missing videoId parameter" },
      { status: 400 }
    );
  }

  // Return fake YouTube metadata for testing
  const fakeMetadata = {
    title: `Test YouTube Video - ${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    transcript: "[00:00] This is a fake transcript for testing purposes.\n[00:15] The video content would be here.\n[00:30] End of fake transcript.",
  };

  return NextResponse.json(fakeMetadata);
}