import { getRequiredUser } from "@/lib/auth-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Typography } from "@workspace/ui/components/typography";
import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminFilters } from "./admin-filters";
import { searchParamsCache } from "./search-params";
import { UserTable } from "./user-table";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getRequiredUser();

  if (user.role !== "admin") {
    notFound();
  }

  const params = await searchParamsCache.parse(searchParams);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="size-6" />
        <Typography variant="h1">Admin Panel</Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters />

          <Suspense fallback={<UserTableSkeleton />}>
            <UserTable searchParams={params} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

const UserTableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 10 }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
);
