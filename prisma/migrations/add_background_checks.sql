-- Add background_checks table for CERTN integration
CREATE TABLE IF NOT EXISTS "background_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "checkr_candidate_id" TEXT,
    "checkr_report_id" TEXT,
    "package_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "initiated_by" TEXT NOT NULL,
    "checkr_report_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "background_checks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "background_checks_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "background_checks_application_id_idx" ON "background_checks"("application_id");
CREATE INDEX IF NOT EXISTS "background_checks_status_idx" ON "background_checks"("status");
CREATE INDEX IF NOT EXISTS "background_checks_checkr_report_id_idx" ON "background_checks"("checkr_report_id");
CREATE INDEX IF NOT EXISTS "background_checks_initiated_by_idx" ON "background_checks"("initiated_by");
CREATE INDEX IF NOT EXISTS "background_checks_created_at_idx" ON "background_checks"("created_at");

-- Add comment for documentation
COMMENT ON TABLE "background_checks" IS 'Stores background check requests and results from CERTN integration';
COMMENT ON COLUMN "background_checks"."package_type" IS 'Type of background check: basic, standard, or comprehensive';
COMMENT ON COLUMN "background_checks"."status" IS 'Status: pending, complete, consider, or suspended';
