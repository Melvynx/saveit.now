import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/v2")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
