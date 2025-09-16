export {
  PrismaClient,
  Prisma,
  $Enums,
  BookmarkType,
  BookmarkStatus,
  BookmarkProcessingRunStatus,
  TagType,
} from "../generated/prisma";
export type {
  Bookmark,
} from "../generated/prisma";
export { prisma } from "./client"; // exports instance of prisma
