import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  type PressableProps,
} from "react-native";
import { cva, type VariantProps } from "../../lib/cva";
import { hapticLight } from "../../lib/haptics";
import { duskColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

const duskButtonVariants = cva(
  "min-h-[52px] flex-row items-center justify-center gap-2 rounded-full px-6 py-4 active:scale-[0.96] disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-dusk-primary",
        white: "bg-white",
        glass: "border border-white/10 bg-white/5",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

const duskButtonLabelVariants = cva("", {
  variants: {
    variant: {
      primary: "font-sans-bold text-[17px] text-dusk-primary-fg",
      white: "font-sans-bold text-[17px] text-dusk",
      glass: "font-sans-semibold text-[16px] text-dusk-fg",
      ghost: "font-sans-semibold text-[15px] text-dusk-muted",
    },
  },
  defaultVariants: { variant: "primary" },
});

const spinnerColors = {
  primary: duskColors.primaryForeground,
  white: duskColors.background,
  glass: duskColors.foreground,
  ghost: duskColors.muted,
} as const;

export type DuskButtonProps = PressableProps &
  VariantProps<typeof duskButtonVariants> & {
    loading?: boolean;
    className?: string;
    labelClassName?: string;
  };

/**
 * Pill button for the fixed-dark "dusk" marketing/auth surfaces. Same API
 * shape as ui/Button, but colors never follow the light/dark scheme.
 */
export function DuskButton({
  className,
  labelClassName,
  variant,
  loading = false,
  disabled,
  children,
  onPress,
  accessibilityLabel,
  accessibilityRole,
  ...props
}: DuskButtonProps) {
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (typeof children === "string" ? children : undefined);

  return (
    <Pressable
      className={cn(duskButtonVariants({ variant }), className)}
      disabled={disabled || loading}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole={accessibilityRole ?? "button"}
      onPress={(e) => {
        hapticLight();
        onPress?.(e);
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColors[variant ?? "primary"]}
        />
      ) : null}
      {typeof children === "string" ? (
        <RNText
          className={cn(duskButtonLabelVariants({ variant }), labelClassName)}
        >
          {children}
        </RNText>
      ) : (
        (children as React.ReactNode)
      )}
    </Pressable>
  );
}
