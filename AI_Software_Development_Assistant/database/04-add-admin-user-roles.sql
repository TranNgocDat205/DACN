-- Run in SSMS AFTER making a database backup, BEFORE starting the updated Backend.
-- Adds global ADMIN/USER roles without changing per-project OWNER/MEMBER records.
USE AI_Software_Assistant;
GO
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    -- Dynamic SQL avoids SQL Server binding the new column before ALTER TABLE runs.
    IF COL_LENGTH(N'dbo.app_users', N'system_role') IS NULL
        EXEC(N'ALTER TABLE dbo.app_users ADD system_role varchar(16) NULL;');

    EXEC(N'UPDATE dbo.app_users SET system_role = ''USER''
           WHERE system_role IS NULL OR system_role NOT IN (''ADMIN'',''USER'');');

    IF EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.app_users') AND name = N'system_role' AND is_nullable = 1)
        EXEC(N'ALTER TABLE dbo.app_users ALTER COLUMN system_role varchar(16) NOT NULL;');

    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints d
        JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
        WHERE d.parent_object_id = OBJECT_ID(N'dbo.app_users') AND c.name = N'system_role'
    )
        EXEC(N'ALTER TABLE dbo.app_users ADD CONSTRAINT DF_app_users_system_role
               DEFAULT (''USER'') FOR system_role;');

    COMMIT TRANSACTION;
    PRINT N'Global account roles initialized; project membership remains unchanged.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
SELECT id, email, system_role FROM dbo.app_users ORDER BY id;
