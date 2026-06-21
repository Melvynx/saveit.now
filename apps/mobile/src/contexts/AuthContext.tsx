import { useQuery } from "convex/react";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { authClient } from "../lib/auth-client";

export type UserLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  canExport: number;
  apiAccess: number;
};

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}

interface UserPlan {
  name: "free" | "pro";
  limits: UserLimits;
}

const DEFAULT_LIMITS: UserLimits = {
  bookmarks: 20,
  monthlyBookmarkRuns: 20,
  canExport: 0,
  apiAccess: 0,
};

interface AuthContextType {
  user: User | null;
  plan: UserPlan;
  isLoading: boolean;
  isPlanLoading: boolean;
  isSigningOut: boolean;
  isAuthenticated: boolean;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutWithNavigation: (navigate: () => void) => Promise<void>;
  /** @deprecated Convex queries are reactive — no manual refresh needed */
  refreshPlan: () => Promise<void>;
  /** @deprecated Convex queries are reactive — no polling needed */
  refreshPlanWithRetry: (expectedPlan?: "pro" | "free") => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isConvexTokenReady, setIsConvexTokenReady] = useState(false);
  const session = authClient.useSession();
  const sessionId = session.data?.session?.id ?? null;
  const baUser = session.data?.user ?? null;

  useEffect(() => {
    let cancelled = false;
    setIsConvexTokenReady(false);

    if (!sessionId) {
      return () => {
        cancelled = true;
      };
    }

    void authClient.convex
      .token({ fetchOptions: { throw: false } })
      .then(({ data }) => {
        if (!cancelled) {
          setIsConvexTokenReady(Boolean(data?.token));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsConvexTokenReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Build a User shape compatible with the existing consumers.
  const user: User | null = baUser
    ? {
        id: baUser.id,
        email: baUser.email,
        name: baUser.name ?? undefined,
        image: (baUser as any).image ?? null,
      }
    : null;

  const hasBetterAuthSession = !!user;
  const isAuthenticated = hasBetterAuthSession && isConvexTokenReady;
  const isLoading =
    session.isPending || (hasBetterAuthSession && !isConvexTokenReady);

  // Reactive plan query — automatically updated when Stripe webhook lands.
  const userLimits = useQuery(
    api.users.queries.getLimits,
    isAuthenticated ? {} : "skip",
  );

  const plan: UserPlan = userLimits
    ? {
        name: (userLimits.plan as "free" | "pro") ?? "free",
        limits: {
          bookmarks: userLimits.limits.bookmarks,
          monthlyBookmarkRuns: userLimits.limits.monthlyBookmarkRuns,
          canExport: userLimits.limits.canExport,
          apiAccess: userLimits.limits.apiAccess,
        },
      }
    : { name: "free", limits: DEFAULT_LIMITS };

  const isPlanLoading = isAuthenticated && userLimits === undefined;

  const sendOTP = async (email: string) => {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    const result = await authClient.signIn.emailOtp({ email, otp });

    if (result.error) {
      throw new Error(result.error.message);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result?.error) {
        throw new Error(result.error.message || "Sign out failed");
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const signOutWithNavigation = async (navigate: () => void) => {
    await signOut();
    navigate();
  };

  // Convex queries are reactive — no manual refresh needed. Keep API surface
  // for backwards compatibility.
  const refreshPlan = async () => {
    // No-op: Convex subscription handles updates automatically.
  };

  const refreshPlanWithRetry = async (
    _expectedPlan: "pro" | "free" = "pro",
  ): Promise<boolean> => {
    // No-op: Convex subscription handles updates automatically.
    // The caller (e.g. upgrade/success redirect) should watch the reactive
    // query value instead of polling.
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        isLoading,
        isPlanLoading,
        isSigningOut,
        isAuthenticated,
        sendOTP,
        verifyOTP,
        signOut,
        signOutWithNavigation,
        refreshPlan,
        refreshPlanWithRetry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
