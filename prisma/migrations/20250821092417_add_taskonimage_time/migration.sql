-- AlterTable
ALTER TABLE "TaskOnImage" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "TaskOnImage" SET "createdAt" = timezone('utc', now());
DELETE FROM "TaskOnImage"
WHERE "imageId" IN (
    SELECT id
    FROM "Image"
    WHERE NOT EXISTS (
        SELECT 1
        FROM "Annotation"
        -- 检查是否存在 createdById 不为 NULL 的标注
        WHERE "Annotation"."imageId" = "Image".id
          AND "Annotation"."createdById" IS NOT NULL
    )
);
