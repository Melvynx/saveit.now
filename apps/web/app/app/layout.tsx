import { Header } from "@/features/page/header";
import { getUserLimits } from "@/lib/auth-session";
import { InjectUserPlan } from "@/lib/auth/user-plan";
import type { ReactNode } from "react";

export default async function RouteLayout(props: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div className="flex max-w-full items-center gap-2">{props.children}</div>
      <InjectUserPlanServer />
    </div>
  );
}

const InjectUserPlanServer = async () => {
  const plan = await getUserLimits();

  return <InjectUserPlan name={plan.plan} limits={plan.limits} />;
};
