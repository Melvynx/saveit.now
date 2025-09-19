import { useState } from "react";
import { Button, H1, Text, YStack } from "tamagui";
import { AuthModal } from "../components/AuthModal";

export default function SignInScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <YStack flex={1} padding="$4">
      {/* Landing Content - Top */}
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingTop="$4"
        paddingHorizontal="$4"
      >
        <YStack alignItems="center" gap="$1">
          <H1
            fontSize="$10"
            fontWeight="600"
            textAlign="center"
            color="$color12"
          >
            Organize nothing.
          </H1>

          <H1
            fontSize="$10"
            fontWeight="bold"
            textAlign="center"
            color="$color11"
          >
            Find everything.
          </H1>
        </YStack>

        <Text
          marginTop="$6"
          fontSize="$4"
          fontWeight="500"
          textAlign="center"
          color="$color10"
          paddingHorizontal="$2"
          lineHeight="$5"
        >
          Save it now—find it in seconds, whether it&apos;s an article, video,
          post, or tool. AI-powered search that actually understands what
          you&apos;re looking for.
        </Text>
      </YStack>

      {/* Sign In Button - Bottom */}
      <YStack paddingBottom="$6">
        <Button
          onPress={() => setShowAuthModal(true)}
          size="$5"
          theme="blue"
          fontWeight="600"
        >
          Sign In
        </Button>
      </YStack>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </YStack>
  );
}
