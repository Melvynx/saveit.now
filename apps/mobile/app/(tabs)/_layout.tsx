import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";

import { useClientOnlyValue } from "../../components/useClientOnlyValue";
import { useColorScheme } from "../../components/useColorScheme";
import Colors from "../../constants/Colors";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const headerShown = useClientOnlyValue(false, true);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown,
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
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }: { color: string }) => (
            <TabBarIcon name="comment" color={color} />
          ),
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
