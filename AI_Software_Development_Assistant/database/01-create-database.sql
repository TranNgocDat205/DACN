/*
  RUN IN SSMS AS SQL SERVER ADMINISTRATOR.
  IMPORTANT: replace CHANGE_THIS_TO_A_STRONG_PASSWORD_2026! before running.
  Script is for LOCAL DEVELOPMENT / student project only.
  Spring JPA creates the tables at first backend startup (ddl-auto=update).
*/
USE master;
GO
IF DB_ID(N'AI_Software_Assistant') IS NULL
BEGIN
    CREATE DATABASE AI_Software_Assistant;
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'ai_app')
BEGIN
    CREATE LOGIN ai_app WITH PASSWORD = 'CHANGE_THIS_TO_A_STRONG_PASSWORD_2026!', CHECK_POLICY = ON;
END;
GO
USE AI_Software_Assistant;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'ai_app')
BEGIN
    CREATE USER ai_app FOR LOGIN ai_app;
END;
GO
-- db_owner is convenient for Hibernate ddl-auto=update DURING DEVELOPMENT ONLY.
IF IS_ROLEMEMBER(N'db_owner',N'ai_app') <> 1
BEGIN
    ALTER ROLE db_owner ADD MEMBER ai_app;
END;
GO
SELECT DB_NAME() AS CurrentDatabase;
SELECT name FROM sys.database_principals WHERE name = N'ai_app';
GO
