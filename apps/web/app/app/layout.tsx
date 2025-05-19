import { Header } from "@/features/page/header";
import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div className="flex items-center gap-2 max-w-full">{props.children}</div>
    </div>
  );
}
