-- Database Optimization Queries - CORRECTED for Prisma Schema
-- Run these on your Supabase database for better performance

-- ===== APPLICATIONS TABLE OPTIMIZATION =====

-- 1. Applications status and date index (uses appliedAt, not created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_applied 
ON applications(status, "appliedAt") 
WHERE is_archived = false;

-- 2. Applications user lookup optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_status
ON applications("userId", status, "appliedAt") 
WHERE is_archived = false;

-- 3. Archive management index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_archived_date
ON applications(is_archived, archived_at) 
WHERE is_archived = true;

-- 4. Application stage tracking index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_stage_time
ON applications(status, current_stage_entered_at, time_in_current_stage_seconds)
WHERE is_archived = false;

-- ===== JOBS TABLE OPTIMIZATION =====

-- 5. Jobs featured and active index (uses createdAt - this was correct)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_featured_status_created
ON jobs(featured, status, "createdAt") 
WHERE status = 'Active';

-- 6. Jobs view count optimization for trending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_view_count_status
ON jobs("viewCount" DESC, status) 
WHERE status = 'Active';

-- 7. Jobs department and location filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_dept_location_status
ON jobs(department, location, status, "createdAt")
WHERE status = 'Active';

-- 8. Jobs salary range filtering  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_salary_range
ON jobs("salaryMin", "salaryMax", status)
WHERE status = 'Active' AND "salaryMin" IS NOT NULL;

-- ===== AUDIT LOGS OPTIMIZATION =====

-- 9. Audit logs timeline queries (already has created_at index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_timeline_enhanced
ON audit_logs(entity_type, entity_id, created_at DESC, event_type);

-- 10. Security events query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_security_events  
ON audit_logs(category, severity, created_at DESC)
WHERE category = 'SECURITY';

-- ===== PERFORMANCE VIEWS =====

-- 11. Dashboard stats materialized view (CORRECTED column names)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats_mv AS
SELECT 
  -- Applications statistics
  COUNT(*) as total_applications,
  COUNT(CASE WHEN "appliedAt" > NOW() - INTERVAL '7 days' THEN 1 END) as recent_applications,
  COUNT(CASE WHEN status = 'Applied' THEN 1 END) as new_applications,
  COUNT(CASE WHEN status = 'Reviewing' THEN 1 END) as reviewing_applications,
  COUNT(CASE WHEN status = 'Interview' THEN 1 END) as interview_applications,
  COUNT(CASE WHEN status = 'Hired' THEN 1 END) as hired_count,
  COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
  
  -- Jobs statistics  
  (SELECT COUNT(*) FROM jobs WHERE status = 'Active') as total_active_jobs,
  (SELECT COUNT(*) FROM jobs WHERE "createdAt" > NOW() - INTERVAL '7 days' AND status = 'Active') as recent_jobs,
  (SELECT COUNT(*) FROM jobs WHERE featured = true AND status = 'Active') as featured_jobs,
  (SELECT COALESCE(SUM("viewCount"), 0) FROM jobs WHERE status = 'Active') as total_views,
  
  -- Users statistics
  (SELECT COUNT(*) FROM users WHERE is_active = true) as total_active_users,
  (SELECT COUNT(*) FROM users WHERE "createdAt" > NOW() - INTERVAL '30 days') as new_users_this_month,
  
  NOW() as last_updated
FROM applications 
WHERE is_archived = false;

-- 12. Application trends view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS application_trends_mv AS
SELECT 
  DATE_TRUNC('day', "appliedAt") as application_date,
  status,
  COUNT(*) as application_count,
  COUNT(DISTINCT "userId") as unique_applicants,
  COUNT(DISTINCT "jobId") as jobs_applied_to
FROM applications
WHERE "appliedAt" > NOW() - INTERVAL '90 days'
  AND is_archived = false
GROUP BY DATE_TRUNC('day', "appliedAt"), status
ORDER BY application_date DESC;

-- ===== REFRESH PROCEDURES =====

-- 13. Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY application_trends_mv;
  
  -- Log the refresh
  INSERT INTO audit_logs (
    event_type, category, action, description,
    actor_type, created_at
  ) VALUES (
    'SYSTEM', 'MAINTENANCE', 'refresh_views', 
    'Performance views refreshed automatically',
    'system', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===== MAINTENANCE PROCEDURES =====

-- 14. Archive old audit logs (keep performance high)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Move audit logs older than 1 year to archive table
  WITH archived AS (
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year'
    RETURNING *
  )
  INSERT INTO audit_logs_archive 
  SELECT * FROM archived;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ===== BACKUP VERIFICATION QUERIES =====

-- 15. Backup integrity check queries
CREATE OR REPLACE FUNCTION verify_backup_integrity(backup_timestamp timestamp)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'applications_count', (SELECT COUNT(*) FROM applications),
    'jobs_count', (SELECT COUNT(*) FROM jobs), 
    'users_count', (SELECT COUNT(*) FROM users),
    'settings_count', (SELECT COUNT(*) FROM settings),
    'latest_application', (SELECT MAX("appliedAt") FROM applications),
    'latest_job', (SELECT MAX("createdAt") FROM jobs),
    'backup_timestamp', backup_timestamp,
    'verification_time', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;