/*
  Warnings:

  - You are about to drop the column `detailedSummary` on the `Bookmark` table. All the data in the column will be lost.
  - You are about to drop the column `detailedSummaryEmbedding` on the `Bookmark` table. All the data in the column will be lost.
  - You are about to drop the column `summaryEmbedding` on the `Bookmark` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bookmark" RENAME COLUMN "detailedSummary" TO "vectorSummary";
ALTER TABLE "Bookmark" RENAME COLUMN "detailedSummaryEmbedding" TO "vectorSummaryEmbedding";
ALTER TABLE "Bookmark" DROP COLUMN "summaryEmbedding";
