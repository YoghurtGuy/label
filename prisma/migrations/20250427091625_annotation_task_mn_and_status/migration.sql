/*
  Warnings:

  - You are about to drop the column `taskId` on the `Annotation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT', 'IGNORE');

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_taskId_fkey";

-- AlterTable
ALTER TABLE "Annotation" DROP COLUMN "taskId",
ADD COLUMN     "status" "AnnotationStatus" NOT NULL DEFAULT 'IGNORE';

-- CreateTable
CREATE TABLE "_AnnotationToAnnotationTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AnnotationToAnnotationTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AnnotationToAnnotationTask_B_index" ON "_AnnotationToAnnotationTask"("B");

-- AddForeignKey
ALTER TABLE "_AnnotationToAnnotationTask" ADD CONSTRAINT "_AnnotationToAnnotationTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnotationToAnnotationTask" ADD CONSTRAINT "_AnnotationToAnnotationTask_B_fkey" FOREIGN KEY ("B") REFERENCES "AnnotationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
