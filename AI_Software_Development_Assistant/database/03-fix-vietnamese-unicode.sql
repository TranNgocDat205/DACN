/*
  FIX VIETNAMESE SHOWN AS '?'  (e.g. "Dự án" -> "D? án")

  Cause: the text columns were created as VARCHAR. SQL Server then stores only the characters of the
  column's code page and turns the rest (ầ ọ ạ ự ệ ...) into '?'.

  NOTE: the backend now runs this conversion automatically at startup (UnicodeColumnMigrator).
  Use this script only if you prefer to run it by hand, or if the log reports a conversion error.

  1. Stop the backend.   2. Back up the database.   3. Run this script in SSMS.
  Text that was ALREADY saved as '?' cannot be recovered: re-type it once after the conversion.
*/
USE AI_Software_Assistant;
GO

-- Columns that will be converted (only VARCHAR ones, in the project's own tables).
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND DATA_TYPE = 'varchar'
  AND TABLE_NAME IN ('app_users','projects','requirements','user_stories','acceptance_criteria','sprints','tasks','documents')
  AND COLUMN_NAME IN ('name','title','description','ai_analysis','narrative','given_text','when_text','then_text','goal','filename')
ORDER BY TABLE_NAME, COLUMN_NAME;
GO

DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'ALTER TABLE dbo.' + QUOTENAME(TABLE_NAME) + N' ALTER COLUMN ' + QUOTENAME(COLUMN_NAME)
  + N' nvarchar(' + CASE WHEN CHARACTER_MAXIMUM_LENGTH = -1 THEN N'max' ELSE CAST(CHARACTER_MAXIMUM_LENGTH AS nvarchar(10)) END + N') '
  + CASE WHEN IS_NULLABLE = 'YES' THEN N'NULL' ELSE N'NOT NULL' END + N';' + CHAR(10)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND DATA_TYPE = 'varchar'
  AND TABLE_NAME IN ('app_users','projects','requirements','user_stories','acceptance_criteria','sprints','tasks','documents')
  AND COLUMN_NAME IN ('name','title','description','ai_analysis','narrative','given_text','when_text','then_text','goal','filename');
PRINT @sql;
EXEC sp_executesql @sql;
GO

-- Verify: every column above should now be nvarchar.
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME IN ('app_users','projects','requirements','user_stories','acceptance_criteria','sprints','tasks','documents')
  AND COLUMN_NAME IN ('name','title','description','ai_analysis','narrative','given_text','when_text','then_text','goal','filename')
ORDER BY TABLE_NAME, COLUMN_NAME;
GO

-- Optional: fix rows that were saved as '?' (replace the Ids and text, always with the N prefix):
-- UPDATE dbo.projects     SET name  = N'Dự án đọc truyện'    WHERE id = 1;
-- UPDATE dbo.app_users    SET name  = N'Trần Ngọc Đạt'       WHERE id = 1;
-- UPDATE dbo.requirements SET title = N'Đăng Nhập Bằng Gmail' WHERE id = 5;
GO
