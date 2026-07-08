-- CreateEnum
CREATE TYPE "BriefMode" AS ENUM ('STATIC', 'ADAPTIVE');

-- AlterTable
ALTER TABLE "ProjectBrief" ADD COLUMN     "clientLinks" JSONB,
ADD COLUMN     "mode" "BriefMode" NOT NULL DEFAULT 'STATIC';

