import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div className="h-full flex flex-col gap-4 lg:gap-12">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full">{props.children}</main>
      <Footer />
    </div>
  );
}
