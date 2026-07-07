import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { Text } from "./text";

export type StatusScreenProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  spinner?: boolean;
  title: string;
  message: string;
  badgeClassName?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function StatusScreen({
  icon,
  iconColor,
  spinner = false,
  title,
  message,
  badgeClassName,
  children,
  footer,
}: StatusScreenProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      {spinner || icon ? (
        <View
          className={cn(
            "h-20 w-20 items-center justify-center rounded-full bg-primary",
            badgeClassName,
          )}
        >
          {spinner ? (
            <ActivityIndicator size="large" color={colors.primaryForeground} />
          ) : icon ? (
            <Ionicons
              name={icon}
              size={36}
              color={iconColor ?? colors.primaryForeground}
            />
          ) : null}
        </View>
      ) : null}

      <View className="items-center gap-2">
        <Text variant="title" className="text-center text-[24px] leading-[30px]">
          {title}
        </Text>
        <Text variant="subtitle" className="max-w-[280px] text-center">
          {message}
        </Text>
      </View>

      {children}
      {footer}
    </View>
  );
}
