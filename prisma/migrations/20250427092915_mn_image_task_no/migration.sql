/*
  Warnings:

  - You are about to drop the `_AnnotationTaskToImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AnnotationTaskToImage" DROP CONSTRAINT "_AnnotationTaskToImage_A_fkey";

-- DropForeignKey
ALTER TABLE "_AnnotationTaskToImage" DROP CONSTRAINT "_AnnotationTaskToImage_B_fkey";

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "taskId" TEXT;

-- DropTable
DROP TABLE "_AnnotationTaskToImage";

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AnnotationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
