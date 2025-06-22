"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient, useSession } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Typography } from "@workspace/ui/components/typography";
import { Ban, Search, UserCheck, Users } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | null;
  createdAt: string;
  emailVerified: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const session = useSession();
  const pageSize = 10;

  if (session.data?.user && session.data?.user.role !== "admin") {
    redirect("/");
  }

  // Fetch users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users", currentPage, searchQuery],
    queryFn: async () => {
      return unwrapSafePromise(
        authClient.admin.listUsers({
          query: {
            limit: pageSize,
            offset: (currentPage - 1) * pageSize,
            ...(searchQuery && {
              searchField: "email" as const,
              searchOperator: "contains" as const,
              searchValue: searchQuery,
            }),
            sortBy: "createdAt",
            sortDirection: "desc",
          },
        }),
      );
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason?: string;
    }) => {
      return unwrapSafePromise(
        authClient.admin.banUser({
          userId,
          banReason: reason || "Banned by admin",
        }),
      );
    },
    onSuccess: () => {
      toast.success("User banned successfully");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to ban user: ${error.message}`);
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(
        authClient.admin.unbanUser({
          userId,
        }),
      );
    },
    onSuccess: () => {
      toast.success("User unbanned successfully");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to unban user: ${error.message}`);
    },
  });

  // Impersonate user mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(
        authClient.admin.impersonateUser({
          userId,
        }),
      );
    },
    onSuccess: () => {
      toast.success("Impersonation started");
      // Refresh the page to update the session
      queryClient.invalidateQueries();
      router.refresh();
      router.push("/app");
    },
    onError: (error: Error) => {
      toast.error(`Failed to impersonate user: ${error.message}`);
    },
  });

  // Set user role mutation
  const setRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "user";
    }) => {
      return unwrapSafePromise(
        authClient.admin.setRole({
          userId,
          role,
        }),
      );
    },
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user role: ${error.message}`);
    },
  });

  const totalPages = usersData ? Math.ceil(usersData.total / pageSize) : 0;

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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          {isLoadingUsers ? (
            <div className="space-y-2">
              {Array.from({ length: pageSize }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users.map((user) => {
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                            {!user.emailVerified && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <div>
                              <Badge variant="destructive">Banned</Badge>
                              {user.banReason && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {user.banReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.banned ? (
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                loading={unbanUserMutation.isPending}
                                onClick={() =>
                                  unbanUserMutation.mutate(user.id)
                                }
                              >
                                <UserCheck className="size-4" />
                                Unban
                              </LoadingButton>
                            ) : (
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                loading={banUserMutation.isPending}
                                onClick={() =>
                                  banUserMutation.mutate({ userId: user.id })
                                }
                              >
                                <Ban className="size-4" />
                                Ban
                              </LoadingButton>
                            )}

                            {!user.banned && (
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                loading={impersonateMutation.isPending}
                                onClick={() =>
                                  impersonateMutation.mutate(user.id)
                                }
                              >
                                Impersonate
                              </LoadingButton>
                            )}

                            {user.role !== "admin" && (
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                loading={setRoleMutation.isPending}
                                onClick={() =>
                                  setRoleMutation.mutate({
                                    userId: user.id,
                                    role: "admin" as const,
                                  })
                                }
                              >
                                Make Admin
                              </LoadingButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Typography variant="muted">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, usersData?.total || 0)} of{" "}
                    {usersData?.total || 0} users
                  </Typography>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
