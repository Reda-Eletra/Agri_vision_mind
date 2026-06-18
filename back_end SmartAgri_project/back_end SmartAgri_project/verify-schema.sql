-- Verify updated database schema

SELECT 'FARMS TABLE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'farms' 
ORDER BY ordinal_position;

SELECT '';
SELECT 'FARM_CYCLES TABLE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'farm_cycles' 
ORDER BY ordinal_position;

SELECT '';
SELECT 'TRACKED_PLANTS TABLE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tracked_plants' 
ORDER BY ordinal_position;

SELECT '';
SELECT 'SCHEDULE_TASKS TABLE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'schedule_tasks' 
ORDER BY ordinal_position;
