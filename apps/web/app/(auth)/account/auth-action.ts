"use server";

import { auth } from "@/lib/auth";
import { userAction } from "@/lib/safe-action";
import { headers } from "next/headers";

export const deleteAccountAction = userAction.action(async ({ ctx }) => {
  const { user } = ctx;
});
