import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";
import { Button, useTheme } from "tamagui";

import { useClientOnlyValue } from "../../components/useClientOnlyValue";
import { useColorScheme } from "../../components/useColorScheme";
import Colors from "../../constants/Colors";
import { useAppTheme } from "../_layout";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function ThemeToggleButton() {
  const theme = useTheme();
  const { currentTheme, toggleTheme } = useAppTheme();

  return (
    <Button
      size="$3"
      variant="outlined"
      backgroundColor="transparent"
      onPress={toggleTheme}
      padding="$2"
      borderRadius="$3"
      marginRight="$3"
    >
      <FontAwesome
        name={currentTheme === "dark" ? "sun-o" : "moon-o"}
        size={20}
        color={theme.color?.val || Colors[currentTheme ?? "light"].text}
      />
    </Button>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="bookmark" color={color} />
          ),
          headerSearchBarOptions: {
            placeholder: "Search bookmarks...",
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="gear" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
