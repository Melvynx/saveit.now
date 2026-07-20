import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { duskColors, useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { Text } from "./text";

export type StatusScreenProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  spinner?: boolean;
  title: string;
  message: string;
  badgeClassName?: string;
  /** "dusk" renders the fixed-dark landing theme (marketing/auth surfaces). */
  variant?: "default" | "dusk";
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
  variant = "default",
  children,
  footer,
}: StatusScreenProps) {
  const colors = useThemeColors();
  const isDusk = variant === "dusk";
  const contentColor = isDusk
    ? duskColors.primaryForeground
    : colors.primaryForeground;

  return (
    <View
      className={cn(
        "flex-1 items-center justify-center gap-6 px-6",
        isDusk ? "bg-dusk" : "bg-background",
      )}
    >
      {spinner || icon ? (
        <View
          className={cn(
            "h-20 w-20 items-center justify-center rounded-full",
            isDusk ? "bg-dusk-primary" : "bg-primary",
            badgeClassName,
          )}
        >
          {spinner ? (
            <ActivityIndicator size="large" color={contentColor} />
          ) : icon ? (
            <Ionicons name={icon} size={36} color={iconColor ?? contentColor} />
          ) : null}
        </View>
      ) : null}

      <View className="items-center gap-2">
        {isDusk ? (
          <Text className="text-center font-serif text-[28px] leading-[34px] text-dusk-fg">
            {title}
          </Text>
        ) : (
          <Text
            variant="title"
            className="text-center text-[24px] leading-[30px]"
          >
            {title}
          </Text>
        )}
        <Text
          variant="subtitle"
          className={cn(
            "max-w-[280px] text-center",
            isDusk && "text-dusk-muted",
          )}
        >
          {message}
        </Text>
      </View>

      {children}
      {footer}
    </View>
  );
}
