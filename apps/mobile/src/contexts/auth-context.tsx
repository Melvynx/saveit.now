import { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<User>;
  signOut: () => Promise<void>;
  isVerifyingOTP: boolean;
  isSendingOTP: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
  } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      try {
        const session = await authClient.getSession();
        return session?.data?.user || null;
      } catch (error) {
        console.error("Error checking session:", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        console.error("Send OTP error:", JSON.stringify(result.error));
        throw new Error(result.error.message);
      }
    },
    onError: (error) => {
      console.error("Send OTP error:", JSON.stringify(error));
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (result.data?.user) {
        return result.data.user;
      } else if (result.error) {
        throw new Error(result.error.message);
      }
      
      throw new Error("Unknown error during OTP verification");
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "session"], user);
    },
    onError: (error) => {
      console.error("Verify OTP error:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "session"], null);
    },
    onError: (error) => {
      console.error("Sign out error:", error);
    },
  });

  const sendOTP = async (email: string) => {
    return sendOTPMutation.mutateAsync(email);
  };

  const verifyOTP = async (email: string, otp: string) => {
    return verifyOTPMutation.mutateAsync({ email, otp });
  };

  const signOut = async () => {
    return signOutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sendOTP,
        verifyOTP,
        signOut,
        isVerifyingOTP: verifyOTPMutation.isPending,
        isSendingOTP: sendOTPMutation.isPending,
        isSigningOut: signOutMutation.isPending,
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