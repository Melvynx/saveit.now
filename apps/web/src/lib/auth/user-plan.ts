"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { AuthLimits } from "../auth-limits";

type UserPlan = {
  name: "free" | "pro";
  limits: AuthLimits;
  isLoading: boolean;
};

export const useUserPlan = create<UserPlan>(() => ({
  name: "free",
  limits: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    canExport: 0,
    apiAccess: 0,
  },
  isLoading: true,
}));

export const InjectUserPlan = (props: Omit<UserPlan, "isLoading">) => {
  useEffect(() => {
    useUserPlan.setState({
      ...props,
      isLoading: false,
    });
  }, [props]);

  return null;
};
