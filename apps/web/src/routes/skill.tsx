import { createFileRoute, redirect } from "@tanstack/react-router";

/** Short link we print in the CLI and the skill itself. */
export const Route = createFileRoute("/skill")({
  beforeLoad: () => {
    throw redirect({ to: "/docs/$slug", params: { slug: "ai-integration" } });
  },
});
