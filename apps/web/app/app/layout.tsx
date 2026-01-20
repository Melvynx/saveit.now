import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 h-full min-h-fit bg-background flex-1">
      <div className="flex max-w-full items-center gap-2">{props.children}</div>
    </div>
  );
}
