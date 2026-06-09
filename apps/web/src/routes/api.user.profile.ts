import { EmailChangeSchema } from "@/lib/schemas/email-change.schema";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/api/user/profile")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const [{ auth }, { requireUser }] = await Promise.all([
          import("@/lib/auth"),
          import("@/lib/safe-route"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const body = profileSchema.parse(await request.json());
        if (body.name !== undefined) {
          await auth.api.updateUser({
            headers: request.headers,
            body: { name: body.name },
          });
        }

        if (body.email !== undefined) {
          const validatedData = EmailChangeSchema.parse({
            newEmail: body.email,
          });

          await auth.api.changeEmail({
            headers: request.headers,
            body: {
              newEmail: validatedData.newEmail,
              callbackURL: "/account",
            },
          });
        }

        return Response.json({ success: true });
      },
    },
  },
});
