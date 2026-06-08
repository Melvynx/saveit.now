import { createFileRoute } from "@tanstack/react-router";

const GET = ({ request }: { request: Request }) => {
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) {
    return Response.json(
      { error: "Missing videoId parameter" },
      { status: 400 },
    );
  }

  return Response.json({
    title: `Test YouTube Video - ${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    transcript:
      "[00:00] This is a fake transcript for testing purposes.\n[00:15] The video content would be here.\n[00:30] End of fake transcript.",
  });
};

export const Route = createFileRoute("/api/fake-worker/youtube")({
  server: { handlers: { GET } },
});
