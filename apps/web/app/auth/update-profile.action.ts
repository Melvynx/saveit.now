"use server";

import { userAction } from "@/lib/safe-action";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  formData: z.instanceof(FormData),
});

export const updateProfileAction = userAction
  .schema(UpdateProfileSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const file = input.formData.get("file");

    return {
      url: "https://x.com",
    };
  });
