-- IMPORTANT: Change the address below to an EXISTING account that YOU control.
-- Execute in SSMS as a database administrator. Do not promote every user.
USE AI_Software_Assistant;
GO
DECLARE @AdminEmail varchar(200)='REPLACE_WITH_YOUR_REGISTERED_EMAIL@example.com';
IF @AdminEmail LIKE 'REPLACE_WITH_%'
  THROW 51000, 'Set @AdminEmail to the email of your existing account before running.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.app_users WHERE email=@AdminEmail)
  THROW 51001, 'Email not registered in app_users. Register the account first.', 1;
UPDATE dbo.app_users SET system_role='ADMIN' WHERE email=@AdminEmail;
SELECT id, name, email, system_role FROM dbo.app_users WHERE email=@AdminEmail;
GO
