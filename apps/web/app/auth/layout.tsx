import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <div
        style={{
          // @ts-expect-error Doesn't care
          "--box-color": "color-mix(in srgb, var(--border) 30%, transparent)",
        }}
        className="bg-background flex-1 bg-opacity-80 [background-image:linear-gradient(var(--box-color)_1px,transparent_1px),linear-gradient(to_right,var(--box-color)_1px,transparent_1px)] [background-size:20px_20px]"
      >
        {props.children}
      </div>
      <Footer />
    </div>
  );
}
