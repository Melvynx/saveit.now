import type { Prisma } from "@workspace/database";
import { prisma } from "@workspace/database/client";
import type { Filter, Order, SortBy } from "@/features/admin/search-params";

const UserInclude = {
  subscriptions: {
    select: {
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
};

export const getUsersWithStats = async ({
  page,
  pageSize = 10,
  search,
  sortBy,
  order,
  filter,
}: GetUsersOptions): Promise<{
  users: UserWithStats[];
  total: number;
  totalPages: number;
}> => {
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.email = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (filter === "premium") {
    where.subscriptions = {
      some: {
        status: "active",
      },
    };
  }

  if (filter === "regular") {
    where.subscriptions = {
      none: {
        status: "active",
      },
    };
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = {};

  if (sortBy === "createdAt") {
    orderBy = { createdAt: order };
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
