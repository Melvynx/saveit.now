import { cn } from "@workspace/ui/lib/utils";
import { ComponentProps } from "react";

export const MaxWidthContainer = (props: ComponentProps<"div">) => {
  return (
    <div {...props} className={cn("mx-auto max-w-5xl px-4", props.className)} />
  );
};
