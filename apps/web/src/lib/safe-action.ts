import { getUser } from "@/lib/auth-session";
import { createSafeActionClient } from "next-safe-action";
import { ApplicationError, SafeActionError } from "./errors";

export const action = createSafeActionClient({
  handleServerError: (error) => {
    if (error instanceof SafeActionError) {
      return { message: error.message };
    }

    if (error instanceof ApplicationError) {
      return { message: error.message, type: error.type };
    }

    console.error(error);

    return { message: "An unexpected error occurred" };
  },
});

export const userAction = action.use(async ({ next }) => {
  const user = await getUser();

  if (!user) {
    throw new SafeActionError("User not found");
  }

  return next({ ctx: { user } });
});
