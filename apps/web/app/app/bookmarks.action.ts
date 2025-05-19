"use server";

import { createBookmark } from "@/lib/database/create-bookmark";
import { userAction } from "@/lib/safe-action";
import { z } from "zod";
import { URL_SCHEMA } from "./schema";

export const createBookmarkAction = userAction
  .schema(
    z.object({
      url: URL_SCHEMA,
    })
  )
  .action(async ({ parsedInput: { url }, ctx: { user } }) => {
    return createBookmark({
      url,
      userId: user.id,
    });
  });
