-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_createdById_fkey";

-- AlterTable
ALTER TABLE "Annotation" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
