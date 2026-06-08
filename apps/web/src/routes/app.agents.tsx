import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/features/app/agents/chat-page";

export const Route = createFileRoute("/app/agents")({
  component: AgentsRoute,
});

function AgentsRoute() {
  return (
    <ClientOnly>
      <AgentsPage />
    </ClientOnly>
  );
}
