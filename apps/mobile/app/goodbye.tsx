import { useRouter } from "expo-router";
import { useEffect } from "react";

import { Button } from "../src/components/ui/button";
import { StatusScreen } from "../src/components/ui/status-screen";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";

export default function GoodbyeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    // Auto sign out when this page loads (account was deleted)
    const autoSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out after account deletion:", error);
      }
    };

    autoSignOut();
  }, [signOut]);

  const goToHome = () => {
    router.replace("/");
  };

  return (
    <StatusScreen
      icon="checkmark-circle"
      iconColor="#10B981"
      badgeClassName="bg-secondary"
      title="Account Deleted"
      message="Your account has been successfully deleted."
      footer={
        <>
          <Text className="max-w-[300px] text-center font-sans text-[14px] leading-[21px] text-muted-foreground">
            Thank you for using SaveIt.now. We&apos;re sorry to see you go. All
            your data has been permanently removed.
          </Text>
          <Button onPress={goToHome} className="mt-2 self-stretch">
            Continue
          </Button>
        </>
      }
    />
  );
}
