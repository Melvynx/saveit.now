import { cookies } from "next/headers";
import { ClientToasts } from "./client-toast";
import { ServerToastSchema } from "./server-toast.schema";

export async function ServerToaster() {
  const cookieStore = await cookies();
  const toasts = cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith("toast-") && cookie.value)
    .map((cookie) => {
      try {
        const parsed = ServerToastSchema.safeParse(JSON.parse(cookie.value));

        if (!parsed.success) {
          return undefined;
        }

        return {
          id: cookie.name,
          ...parsed.data,
          dismiss: async () => {
            "use server";
            const cookieStore = await cookies();
            cookieStore.delete(cookie.name);
          },
        };
      } catch {
        return undefined;
      }
    })
    .filter((toast) => toast !== undefined);

  return <ClientToasts toasts={toasts} />;
}
