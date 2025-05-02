/*
  Warnings:

  - You are about to drop the column `taskId` on the `Image` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_taskId_fkey";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "taskId";

-- CreateTable
CREATE TABLE "TaskOnImage" (
    "taskId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,

    CONSTRAINT "TaskOnImage_pkey" PRIMARY KEY ("taskId","imageId")
);

-- AddForeignKey
ALTER TABLE "TaskOnImage" ADD CONSTRAINT "TaskOnImage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AnnotationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOnImage" ADD CONSTRAINT "TaskOnImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
