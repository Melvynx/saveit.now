import { createContext, useContext, useEffect, useState } from "react";
import { apiClient, UserLimits } from "../lib/api-client";
import { authClient } from "../lib/auth-client";
import { getServerUrl } from "../lib/server-url";

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
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<UserPlan>({
    name: "free",
    limits: DEFAULT_LIMITS,
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return false;
    return true;
  });
  const [isPlanLoading, setIsPlanLoading] = useState(false);

  const fetchUserPlan = async () => {
    setIsPlanLoading(true);
    try {
      const response = await apiClient.getUserLimits();
      setPlan({
        name: response.plan,
        limits: response.limits,
      });
    } catch (error) {
      console.error("Error fetching user plan:", error);
    } finally {
      setIsPlanLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSession = async () => {
      console.log("🔐 AuthContext - Checking session at:", getServerUrl());
      setIsLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session check timeout")), 5000),
        );
        const sessionPromise = authClient.getSession();

        const session = (await Promise.race([
          sessionPromise,
          timeoutPromise,
        ])) as Awaited<typeof sessionPromise>;
        const currentUser = session?.data?.user || null;
        setUser(currentUser);

        if (currentUser) {
          fetchUserPlan();
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const sendOTP = async (email: string) => {
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        console.error("Send OTP error:", JSON.stringify(result.error));
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Send OTP error:", JSON.stringify(error));
      throw error;
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (result.data?.user) {
        setUser(result.data.user);
      } else if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    console.log("🔐 AuthContext - Starting sign out...");
    try {
      const result = await authClient.signOut();
      console.log("🔐 AuthContext - Sign out result:", JSON.stringify(result));

      if (result?.error) {
        console.error(
          "🔐 AuthContext - Sign out error from server:",
          result.error,
        );
        throw new Error(result.error.message || "Sign out failed");
      }

      setUser(null);
      setPlan({ name: "free", limits: DEFAULT_LIMITS });
      console.log("🔐 AuthContext - Sign out completed, user cleared");
    } catch (error) {
      console.error("🔐 AuthContext - Sign out error:", error);
      throw error;
    }
  };

  const refreshPlan = async () => {
    await fetchUserPlan();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        isLoading,
        isPlanLoading,
        sendOTP,
        verifyOTP,
        signOut,
        refreshPlan,
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
