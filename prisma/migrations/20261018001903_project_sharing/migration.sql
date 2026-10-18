-- Stage 16: a project's status page for its client.

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "shareToken" VARCHAR(64),
ADD COLUMN     "sharedAt" TIMESTAMP(3),
ADD COLUMN     "shareTasks" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex (every existing row is null, so nothing can clash)
CREATE UNIQUE INDEX "projects_shareToken_key" ON "projects"("shareToken");
