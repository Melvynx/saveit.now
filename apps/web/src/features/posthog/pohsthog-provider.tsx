import { useLocation } from "@tanstack/react-router";
import posthog from "posthog-js";
import { Suspense, useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!import.meta.env.VITE_POSTHOG_KEY) return;

    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      capture_pageview: false, // We capture pageviews manually
      capture_pageleave: true, // Enable pageleave capture
    });
  }, []);

  return (
    <>
      <SuspendedPostHogPageView />
      {children}
    </>
  );
}

function PostHogPageView() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname) {
      const url = window.origin + location.pathname + location.searchStr;
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [location.pathname, location.searchStr]);

  return null;
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
