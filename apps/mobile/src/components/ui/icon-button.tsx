import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Pressable } from "react-native";
import { hapticSelection } from "../../lib/haptics";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

export type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  disabled?: boolean;
  className?: string;
};

const SIZES = {
  sm: { container: "h-9 w-9", icon: 18 },
  md: { container: "h-10 w-10", icon: 18 },
  lg: { container: "h-11 w-11", icon: 19 },
  xl: { container: "h-[52px] w-[52px]", icon: 21 },
} as const;

export function IconButton({
  icon,
  onPress,
  size = "sm",
  color,
  disabled,
  className,
}: IconButtonProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      disabled={disabled}
      hitSlop={6}
      className={cn(
        "items-center justify-center rounded-full bg-secondary active:opacity-70 disabled:opacity-50",
        SIZES[size].container,
        className,
      )}
    >
      <Ionicons
        name={icon}
        size={SIZES[size].icon}
        color={color ?? colors.foreground}
      />
    </Pressable>
  );
}
