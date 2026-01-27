-- SQL Script to remove startups with SCOPING or CONTRACT stages
-- Run this with: sqlite3 instance/turningidea.db < scripts/cleanup_removed_stages.sql

-- First, let's see what we're about to delete
SELECT 'Startups to be deleted:' AS info;
SELECT id, name, current_stage, user_id, submission_id 
FROM startups 
WHERE current_stage IN ('SCOPING', 'CONTRACT');

-- Get count
SELECT 'Total count:' AS info, COUNT(*) as count 
FROM startups 
WHERE current_stage IN ('SCOPING', 'CONTRACT');

-- Now delete all related data for these startups
-- Note: Most deletions will cascade automatically due to foreign key constraints

-- Delete startups with SCOPING or CONTRACT stages
-- This will cascade delete most related data
DELETE FROM startups 
WHERE current_stage IN ('SCOPING', 'CONTRACT');

-- Verify deletion
SELECT 'Remaining startups with removed stages:' AS info, COUNT(*) as count 
FROM startups 
WHERE current_stage IN ('SCOPING', 'CONTRACT');

SELECT 'Cleanup complete!' AS status;
