/*
  Warnings:

  - You are about to drop the column `taskId` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the `_AnnotationToAnnotationTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_taskId_fkey";

-- DropForeignKey
ALTER TABLE "_AnnotationToAnnotationTask" DROP CONSTRAINT "_AnnotationToAnnotationTask_A_fkey";

-- DropForeignKey
ALTER TABLE "_AnnotationToAnnotationTask" DROP CONSTRAINT "_AnnotationToAnnotationTask_B_fkey";

-- AlterTable
ALTER TABLE "Annotation" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "taskId";

-- DropTable
DROP TABLE "_AnnotationToAnnotationTask";

-- CreateTable
CREATE TABLE "_AnnotationTaskToImage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AnnotationTaskToImage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AnnotationTaskToImage_B_index" ON "_AnnotationTaskToImage"("B");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AnnotationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnotationTaskToImage" ADD CONSTRAINT "_AnnotationTaskToImage_A_fkey" FOREIGN KEY ("A") REFERENCES "AnnotationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnotationTaskToImage" ADD CONSTRAINT "_AnnotationTaskToImage_B_fkey" FOREIGN KEY ("B") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
