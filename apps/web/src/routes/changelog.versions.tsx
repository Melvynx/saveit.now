import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog/versions")({
  loader: () => {
    throw redirect({ to: "/changelog" });
  },
});
