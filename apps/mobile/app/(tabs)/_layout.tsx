import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

import { useThemeColors } from "../../src/lib/theme";

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 85,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint={colors.isDark ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.isDark
                  ? "rgba(10, 10, 10, 0.55)"
                  : "rgba(255, 255, 255, 0.55)",
              },
            ]}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "DMSans_600SemiBold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
