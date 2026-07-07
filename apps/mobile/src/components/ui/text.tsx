import * as React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cva, type VariantProps } from "../../lib/cva";
import { cn } from "../../lib/utils";

const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      title: "font-sans-bold text-[34px] leading-[41px] tracking-tight",
      subtitle: "font-sans text-[15px] leading-5 text-muted-foreground",
      "section-label":
        "font-sans-semibold text-[13px] uppercase tracking-wider text-muted-foreground",
      body: "font-sans text-[15px] leading-[22px]",
      "body-sm": "font-sans text-[13px] leading-[19px]",
      caption: "font-sans text-[12px] text-muted-foreground",
      label: "font-sans-semibold text-[15px]",
      "cta-label": "font-sans-bold text-[17px]",
    },
  },
  defaultVariants: { variant: "body" },
});

export type TextProps = RNTextProps & VariantProps<typeof textVariants>;

export function Text({ className, variant, ...props }: TextProps) {
  return <RNText className={cn(textVariants({ variant }), className)} {...props} />;
}
