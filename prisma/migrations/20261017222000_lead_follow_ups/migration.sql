-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'CONTACTED';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lastContactedOn" DATE,
ADD COLUMN     "nextFollowUpOn" DATE;

-- CreateIndex
CREATE INDEX "leads_workspaceId_nextFollowUpOn_idx" ON "leads"("workspaceId", "nextFollowUpOn");
