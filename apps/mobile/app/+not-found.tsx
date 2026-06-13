import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { Text } from "../src/components/ui/text";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="title" className="text-center text-[20px] leading-[26px]">
          {"This screen doesn't exist."}
        </Text>

        <Link href="/" className="py-4">
          <Text className="font-sans-semibold text-[15px] text-foreground underline">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
