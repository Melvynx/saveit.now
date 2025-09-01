import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div
      style={{
        // @ts-expect-error Doesn't care
        "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
      }}
      className={cn(
        "flex flex-col gap-4 h-full min-h-fit",
        "bg-background flex-1 flex flex-col bg-opacity-80",
      )}
    >
      <div className="flex max-w-full items-center gap-2">{props.children}</div>
    </div>
  );
}
