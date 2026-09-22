-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "activity_logs" 
  ALTER COLUMN "validationStatus" TYPE "ValidationStatus" 
  USING (
    CASE 
      WHEN "validationStatus" = 'APPROVED' THEN 'APPROVED'::"ValidationStatus"
      WHEN "validationStatus" = 'REJECTED' THEN 'REJECTED'::"ValidationStatus"
      ELSE NULL
    END
  );
