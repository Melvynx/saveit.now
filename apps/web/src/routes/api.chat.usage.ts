import { getRequiredUser } from "@/lib/auth-session";
import { getChatUsage } from "@/lib/chat/check-chat-limits";
import { createFileRoute } from "@tanstack/react-router";

const GET = async () => {
  const user = await getRequiredUser();
  const usage = await getChatUsage(user.id);
  return Response.json(usage);
};

export const Route = createFileRoute("/api/chat/usage")({
  server: { handlers: { GET } },
});
