import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cva, type VariantProps } from "../../lib/cva";
import { useThemeColors } from "../../lib/theme";
import { cn } from "../../lib/utils";

const inputVariants = cva(
  "rounded-xl border px-4 py-3 font-sans text-[14px] leading-5 text-foreground",
  {
    variants: {
      variant: {
        default: "border-border bg-background",
        filled: "border-transparent bg-secondary",
        muted: "border-border bg-muted",
      },
      inputSize: {
        default: "min-h-[44px]",
        sm: "min-h-[36px] px-3 py-2 text-[13px]",
        lg: "min-h-[52px] px-5 py-4 text-[15px]",
        pill: "min-h-[52px] rounded-full px-5 text-[16px]",
      },
    },
    defaultVariants: { variant: "default", inputSize: "default" },
  },
);

export type InputProps = TextInputProps & VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, variant, inputSize, ...props }, ref) => {
    const colors = useThemeColors();
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        className={cn(inputVariants({ variant, inputSize }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
