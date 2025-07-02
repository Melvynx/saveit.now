import { Prisma, prisma } from "@workspace/database";
import type { Filter, Order, SortBy } from "../../../app/admin/search-params";

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
  // Build where clause
  const whereClause: Prisma.UserWhereInput = {};

  // Search filter
  if (search) {
    whereClause.email = {
      contains: search,
      mode: "insensitive",
    };
  }

  // Premium/Regular filter
  if (filter === "premium") {
    whereClause.subscriptions = {
      some: {
        status: "active",
      },
    };
  }

  // Build order clause - only support what Prisma can handle natively
  let orderByClause: Prisma.UserOrderByWithRelationInput = {};

  if (sortBy === "createdAt") {
    orderByClause = { createdAt: order };
  } else if (sortBy === "bookmarks") {
    orderByClause = {
      bookmarks: {
        _count: order,
      },
    };
  } else if (sortBy === "clicks") {
    orderByClause = {
      bookmarkOpens: {
        _count: order,
      },
    };
  }

  // Get users with basic info
  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: UserInclude,
  });

  // Get total count
  const total = await prisma.user.count({
    where: whereClause,
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    users,
    total,
    totalPages,
  };
};
