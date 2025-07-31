import { createContext, useContext, useEffect, useState } from "react";
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
  verifyOTP: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        setUser(session?.data?.user || null);
      } catch (error) {
        console.error("Error checking session:", error);
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
    try {
      await authClient.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sendOTP, verifyOTP, signOut }}
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
