-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "deleteById" TEXT;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_deleteById_fkey" FOREIGN KEY ("deleteById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
