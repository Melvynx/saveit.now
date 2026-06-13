import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  type PressableProps,
} from "react-native";
import { cva, type VariantProps } from "../../lib/cva";
import { hapticLight } from "../../lib/haptics";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center active:opacity-80 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary",
        outline: "border border-border bg-background",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
        destructive: "bg-destructive/10",
        link: "bg-transparent",
      },
      size: {
        default: "min-h-[52px] gap-2 rounded-full px-6 py-4",
        sm: "min-h-[36px] gap-1.5 rounded-full px-4 py-2",
        lg: "min-h-[56px] gap-2 rounded-full px-7 py-4",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonLabelVariants = cva("font-sans-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive",
      link: "text-primary underline",
    },
    size: {
      default: "font-sans-bold text-[17px]",
      sm: "font-sans-semibold text-[14px]",
      lg: "font-sans-bold text-[17px]",
      icon: "text-[15px]",
      "icon-sm": "text-[13px]",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    className?: string;
    labelClassName?: string;
  };

export function Button({
  className,
  labelClassName,
  variant,
  size,
  loading = false,
  disabled,
  children,
  onPress,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();
  const spinnerColor =
    variant === "default" || variant == null
      ? colors.primaryForeground
      : colors.foreground;

  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      onPress={(e) => {
        hapticLight();
        onPress?.(e);
      }}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      {typeof children === "string" ? (
        <RNText className={cn(buttonLabelVariants({ variant, size }), labelClassName)}>
          {children}
        </RNText>
      ) : (
        (children as React.ReactNode)
      )}
    </Pressable>
  );
}
