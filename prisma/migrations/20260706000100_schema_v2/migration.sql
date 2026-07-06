-- AlterTable
ALTER TABLE "ProjectBrief" DROP COLUMN "analysisModels",
DROP COLUMN "categorisedRequirements",
DROP COLUMN "documentationData",
DROP COLUMN "gatheringMethods",
DROP COLUMN "stakeholders",
ADD COLUMN     "briefShareToken" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefVersion" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "agencyName" TEXT NOT NULL DEFAULT 'Discovery Pro',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BriefVersion_briefId_idx" ON "BriefVersion"("briefId");

-- CreateIndex
CREATE INDEX "Attachment_briefId_idx" ON "Attachment"("briefId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBrief_briefShareToken_key" ON "ProjectBrief"("briefShareToken");

-- CreateIndex
CREATE INDEX "ProjectBrief_ownerId_idx" ON "ProjectBrief"("ownerId");

-- AddForeignKey
ALTER TABLE "ProjectBrief" ADD CONSTRAINT "ProjectBrief_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefVersion" ADD CONSTRAINT "BriefVersion_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ProjectBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ProjectBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

