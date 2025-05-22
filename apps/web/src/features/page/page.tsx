import { cn, cva, VariantProp } from "@workspace/ui/lib/utils";
import { ComponentProps } from "react";

const maxWidthContainerVariants = cva("mx-auto max-w-5xl px-4 w-full", {
  variants: {
    spacing: {
      default: "",
      sm: "my-8",
    },
  },
  defaultVariants: {
    spacing: "default",
  },
});

export const MaxWidthContainer = (
  props: ComponentProps<"div"> & VariantProp<typeof maxWidthContainerVariants>,
) => {
  return (
    <div
      {...props}
      className={cn(
        maxWidthContainerVariants({ spacing: props.spacing }),
        props.className,
      )}
    />
  );
};
