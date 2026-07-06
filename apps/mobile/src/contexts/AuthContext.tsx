import { createContext, useContext, useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { authClient } from "../lib/auth-client";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningOut: boolean;
  isAuthenticated: boolean;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  signInWithSocial: (provider: "google" | "github") => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutWithNavigation: (navigate: () => void) => Promise<void>;
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

  const signInWithSocial = async (provider: "google" | "github") => {
    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  };

  const signInWithApple = async () => {
    const isAvailable = await AppleAuthentication.isAvailableAsync();

    if (!isAvailable) {
      throw new Error("Sign in with Apple is not available on this device");
    }

    let credential: AppleAuthentication.AppleAuthenticationCredential;

    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }

      throw error;
    }

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token");
    }

    const result = await authClient.signIn.social({
      provider: "apple",
      idToken: { token: credential.identityToken },
    });

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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSigningOut,
        isAuthenticated,
        sendOTP,
        verifyOTP,
        signInWithSocial,
        signInWithApple,
        signOut,
        signOutWithNavigation,
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
