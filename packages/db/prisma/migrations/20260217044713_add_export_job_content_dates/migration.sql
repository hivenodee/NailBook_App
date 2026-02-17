-- AlterTable
ALTER TABLE "ExportJob" ADD COLUMN     "content" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);
