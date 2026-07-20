import { createFileRoute } from "@tanstack/react-router";

import {
  LANDING_HEAD,
  LandingPage,
} from "@/features/marketing/landing/landing-page";

export const Route = createFileRoute("/home")({
  head: () => LANDING_HEAD,
  component: LandingPage,
});
