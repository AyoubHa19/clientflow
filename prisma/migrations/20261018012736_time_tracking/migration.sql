-- Stage 17: time spent on projects (and tasks), for real hourly rates.

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "taskId" UUID,
    "userId" TEXT,
    "day" DATE NOT NULL,
    "minutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "note" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entries_workspaceId_projectId_idx" ON "time_entries"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "time_entries_workspaceId_day_idx" ON "time_entries"("workspaceId", "day");

-- CreateIndex
CREATE INDEX "time_entries_userId_idx" ON "time_entries"("userId");

-- CreateIndex
CREATE INDEX "time_entries_taskId_idx" ON "time_entries"("taskId");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- What Prisma's schema can't say:
-- a finished entry lasts 1 minute to 24 hours; a running one has a start.
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_minutes_range"
  CHECK ("minutes" IS NULL OR "minutes" BETWEEN 1 AND 1440);
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_running_has_start"
  CHECK ("minutes" IS NOT NULL OR "startedAt" IS NOT NULL);
-- At most one running timer per person, even with two clicks at once.
CREATE UNIQUE INDEX "time_entries_one_running_timer"
  ON "time_entries"("userId") WHERE "minutes" IS NULL;
