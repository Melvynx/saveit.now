import type { Prisma } from "@workspace/database";
import { prisma } from "@workspace/database/client";
import type {
  Filter,
  Order,
  SortBy,
  UserRoleFilter,
  UserStatus,
} from "@/features/admin/search-params";

const UserInclude = {
  subscriptions: {
    select: {
      plan: true,
      status: true,
      periodEnd: true,
    },
  },
  _count: {
    select: {
      bookmarks: true,
      bookmarkOpens: true,
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithStats = Prisma.UserGetPayload<{
  include: typeof UserInclude;
}>;

type GetUsersOptions = {
  page: number;
  pageSize?: number;
  search?: string;
  sortBy: SortBy;
  order: Order;
  filter: Filter;
  status: UserStatus;
  role: UserRoleFilter;
};

export type AdminOverview = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  premiumUsers: number;
  regularUsers: number;
  totalBookmarks: number;
  totalClicks: number;
  marketingEligibleUsers: number;
};

export const getUsersWithStats = async ({
  page,
  pageSize = 10,
  search,
  sortBy,
  order,
  filter,
  status,
  role,
}: GetUsersOptions): Promise<{
  users: UserWithStats[];
  total: number;
  totalPages: number;
}> => {
  const andConditions: Prisma.UserWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { id: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (filter === "premium") {
    andConditions.push({
      subscriptions: {
        some: {
          status: { in: ["active", "trialing"] },
        },
      },
    });
  }

  if (filter === "regular") {
    andConditions.push({
      subscriptions: {
        none: {
          status: { in: ["active", "trialing"] },
        },
      },
    });
  }

  if (status === "banned") {
    andConditions.push({ banned: true });
  }

  if (status === "active") {
    andConditions.push({ OR: [{ banned: false }, { banned: null }] });
  }

  if (role === "admin") {
    andConditions.push({ role: "admin" });
  }

  if (role === "user") {
    andConditions.push({ OR: [{ role: "user" }, { role: null }] });
  }

  const where: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  let orderBy: Prisma.UserOrderByWithRelationInput = {};

  if (sortBy === "createdAt") {
    orderBy = { createdAt: order };
  } else if (sortBy === "name") {
    orderBy = { name: order };
  } else if (sortBy === "bookmarks") {
    orderBy = { bookmarks: { _count: order } };
  } else if (sortBy === "clicks") {
    orderBy = { bookmarkOpens: { _count: order } };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: UserInclude,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
};

export const getAdminOverview = async (): Promise<AdminOverview> => {
  const premiumWhere: Prisma.UserWhereInput = {
    subscriptions: { some: { status: { in: ["active", "trialing"] } } },
  };
  const activeUserWhere: Prisma.UserWhereInput = {
    OR: [{ banned: false }, { banned: null }],
  };

  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    adminUsers,
    premiumUsers,
    totalBookmarks,
    totalClicks,
    marketingEligibleUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: activeUserWhere }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: premiumWhere }),
    prisma.bookmark.count(),
    prisma.bookmarkOpen.count(),
    prisma.user.count({ where: { unsubscribed: false } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    bannedUsers,
    adminUsers,
    premiumUsers,
    regularUsers: Math.max(totalUsers - premiumUsers, 0),
    totalBookmarks,
    totalClicks,
    marketingEligibleUsers,
  };
};
