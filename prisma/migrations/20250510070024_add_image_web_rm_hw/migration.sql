/*
  Warnings:

  - You are about to drop the column `height` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Image` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ImageStorageType" AS ENUM ('SERVER', 'WEB');

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "height",
DROP COLUMN "width",
ADD COLUMN     "storage" "ImageStorageType" NOT NULL DEFAULT 'SERVER',
ADD COLUMN     "url" TEXT;
