import * as React from "react";
import { ActivityIndicator, View, type ViewProps } from "react-native";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

export function LoadingScreen({
  className,
  size = "large",
  ...props
}: ViewProps & { size?: "small" | "large" }) {
  const colors = useThemeColors();
  return (
    <View
      className={cn("flex-1 items-center justify-center bg-background", className)}
      {...props}
    >
      <ActivityIndicator size={size} color={colors.foreground} />
    </View>
  );
}

export function LoadingSpinner({
  size = "large",
  color,
}: {
  size?: "small" | "large";
  color?: string;
}) {
  const colors = useThemeColors();
  return <ActivityIndicator size={size} color={color ?? colors.foreground} />;
}
