import { AdminShell } from "@/features/admin/admin-shell";
import { useSession } from "@/lib/auth-client";
import {
  createFileRoute,
  Navigate,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ShieldAlert } from "lucide-react";

/**
 * `/admin` is a pure layout: auth gate + shell + <Outlet />.
 *
 * It deliberately declares no `validateSearch`. The previous version validated
 * the users-list search params here, which leaked `?page=1&search=&sortBy=...`
 * onto every child URL — including user detail pages.
 */
export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const session = useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;

  // The shell is static chrome, so it can paint before the session resolves.
  // Rendering `null` here (the old behaviour) blanked the whole page on every
  // hard load.
  if (session.isPending) {
    return (
      <AdminShell pathname={pathname}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminShell>
    );
  }

  if (!session.data?.user) {
    return <Navigate to="/signin" />;
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="bg-muted text-muted-foreground mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This area is only available to SaveIt.now administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell pathname={pathname}>
      <Outlet />
    </AdminShell>
  );
}
