"use client";

import type { UserWithStats } from "@/lib/database/admin-users";
import { useRouter } from "next/navigation";
import { UserRow } from "./user-row";

type UserRowClientProps = {
  user: UserWithStats;
};

export const UserRowClient = ({ user }: UserRowClientProps) => {
  const router = useRouter();

  const handleUserUpdate = () => {
    router.refresh();
  };

  return <UserRow user={user} onUserUpdate={handleUserUpdate} />;
};
