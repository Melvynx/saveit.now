import { cn, cva, VariantProp } from "@workspace/ui/lib/utils";
import { ComponentProps } from "react";

const maxWidthContainerVariants = cva("mx-auto px-4 w-full", {
  variants: {
    spacing: {
      default: "",
      sm: "py-8 lg:py-12 xl:py-24",
    },
    width: {
      default: "max-w-5xl",
      lg: "max-w-7xl",
    },
  },
  defaultVariants: {
    spacing: "default",
    width: "default",
  },
});

export const MaxWidthContainer = (
  props: ComponentProps<"div"> & VariantProp<typeof maxWidthContainerVariants>,
) => {
  return (
    <div
      {...props}
      className={cn(
        maxWidthContainerVariants({
          spacing: props.spacing,
          width: props.width,
        }),
        props.className,
      )}
    />
  );
};
