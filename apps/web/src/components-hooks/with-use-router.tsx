"use client";

import { useRouter } from "next/navigation";

type RouterOutput = ReturnType<typeof useRouter>;

export type WithUseRouterProps = {
  children: (props: { router: RouterOutput }) => React.ReactNode;
};

export const WithUseRouter = (props: WithUseRouterProps) => {
  const router = useRouter();

  return props.children({
    router,
  });
};
