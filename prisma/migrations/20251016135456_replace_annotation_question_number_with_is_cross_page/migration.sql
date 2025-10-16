/*
  Warnings:

  - You are about to drop the column `questionNumber` on the `Annotation` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Dataset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Annotation" DROP COLUMN "questionNumber",
ADD COLUMN     "isCrossPage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Dataset" DROP COLUMN "category";

-- DropEnum
DROP TYPE "DatasetCategory";
