# HƯỚNG DẪN KẾT NỐI SQL SERVER TRÊN WINDOWS 10/11

## A. Cài đặt phần mềm
1. Cài **Microsoft SQL Server Developer hoặc Express** (Database Engine) và **SQL Server Management Studio (SSMS)**. SSMS là công cụ quản lý, không phải database engine.
2. Trong SQL Server Setup, nhớ tên instance: mặc định `MSSQLSERVER` hoặc thường là `SQLEXPRESS`.
3. Mở SSMS, kết nối `localhost` hoặc `localhost\\SQLEXPRESS` với Windows Authentication. Có thể dùng Docker SQL Server thay vì bản cài trực tiếp (file `docker-compose.sqlserver.yml`).

## B. Bật SQL Server Authentication (Mixed Mode)
1. Trong SSMS nhấn phải vào server > Properties > Security.
2. Chọn **SQL Server and Windows Authentication mode**, nhấn OK.
3. Trong SQL Server Configuration Manager khởi động lại dịch vụ SQL Server (tên instance tương ứng).
4. Chỉ sử dụng tài khoản SQL chuyên biệt `ai_app` cho ứng dụng, không dùng `sa`.

## C. Bật TCP/IP, cố định cổng 1433
1. Windows Start > SQL Server Configuration Manager. Với SQL Server 2022 có thể mở `C:\Windows\SysWOW64\SQLServerManager16.msc`.
2. SQL Server Network Configuration > Protocols for MSSQLSERVER (hoặc SQLEXPRESS).
3. Bật TCP/IP = Enabled. Nhấn đúp TCP/IP > IP Addresses > IPAll: đặt TCP Dynamic Ports thành trống, TCP Port thành **1433**. Nếu cổng bị chương trình khác chiếm, chọn cổng khác và sửa DB_URL.
4. Restart dịch vụ SQL Server. Chỉ mở Windows Firewall port nếu thật sự kết nối từ máy khác; môi trường local không cần public port 1433.
5. Trong SSMS kết nối `127.0.0.1,1433` và Windows Authentication để kiểm tra TCP.

## D. Tạo database và tài khoản
1. SSMS > New Query, mở `database/01-create-database.sql`.
2. **THAY** mật khẩu `CHANGE_THIS_TO_A_STRONG_PASSWORD_2026!` bằng mật khẩu mạnh do bạn tự đặt (ít nhất 8 ký tự; kết hợp 3 trong 4 nhóm chữ hoa, thường, số, đặc biệt).
3. Nhấn Execute. Kết quả có database `AI_Software_Assistant`, SQL login và user `ai_app`. Nếu chạy lần thứ hai, script không đổi mật khẩu login hiện có.
4. Trong SSMS thử đăng xuất, đăng nhập **SQL Server Authentication** với `ai_app` và mật khẩu vừa đặt vào server `127.0.0.1,1433`.

## E. Cấu hình backend
Trong `backend/`, sao chép `.env.example` thành `.env`; sửa các biến:

```properties
DB_URL=jdbc:sqlserver://localhost:1433;databaseName=AI_Software_Assistant;encrypt=true;trustServerCertificate=true
DB_USER=ai_app
DB_PASSWORD=MAT_KHAU_BAN_DA_DAT_CHO_ai_app
JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_KEY=CHUOI_BI_MAT_GIONG_HET_AI_SERVICE
CORS_ORIGIN=http://localhost:5173
```

**Chú ý:** `DB_URL` là JDBC URL cho Java, khác với tên server trong SSMS. Nếu instance có port khác, thay `1433`. JDBC Microsoft hỗ trợ `encrypt=true`; `trustServerCertificate=true` là cấu hình phát triển tự ký chứng thư, KHÔNG nên dùng production.

## F. Chạy backend và kiểm tra bảng
- PowerShell tại thư mục gốc: `powershell -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1`
- Chờ Spring Boot khởi động, truy cập `http://localhost:8080/api/health`.
- Chạy `database/02-check-tables.sql` trong SSMS sau khi backend chạy. Spring Data JPA `ddl-auto=update` sẽ tạo các bảng `app_users`, `projects`, `project_members`, `requirements`, `user_stories`, `acceptance_criteria`, `sprints`, `tasks`, `documents`.
- Chưa có dữ liệu là bình thường; đăng ký tài khoản và tạo project từ trang web.

## G. Kết nối từ NetBeans
1. Mở NetBeans bản hỗ trợ JDK 21 và Maven, File > Open Project.
2. Chọn **thư mục `backend`** (bên trong có `pom.xml`, không chọn thư mục ZIP cha).
3. Set Project SDK/JDK = 21.
4. Import Maven Dependencies (cần mạng trong lần đầu để tải JAR).
5. Có thể chạy từ terminal qua script `Start-Backend.ps1` để đọc biến môi trường từ `.env`.
6. Nếu chạy qua Run Project của NetBeans, cấu hình cùng biến môi trường trong Run Configuration hoặc chạy PowerShell script, vì Java/Spring **không tự đọc file `.env`**.

## H. Xử lý lỗi thường gặp
- `Login failed for user ai_app`: mật khẩu sai, SQL login bị disable hoặc chưa bật Mixed Mode. Kiểm tra login với SSMS SQL Server Authentication.
- `The TCP/IP connection to host localhost, port 1433 has failed`: chưa bật TCP/IP, chưa restart service hoặc cổng khác.
- `Cannot open database AI_Software_Assistant`: chưa chạy script hoặc user chưa được ánh xạ database.
- `The driver could not establish a secure connection`: trong máy dev thử cấu hình `encrypt=true;trustServerCertificate=true`; production dùng chứng chỉ hợp lệ.
- `No suitable driver`: Maven chưa tải dependency `mssql-jdbc`, chạy `mvn -U clean package` khi có Internet.
- `Port 1433 is in use`: đang có 2 SQL Server; dùng bản đã cài **hoặc** Docker, không mở cả 2 chung port.
- `mvn is not recognized`: cài Maven 3.9+ và thêm `bin` vào PATH.
- `Cannot find ... tables`: startup backend phải thành công thì Hibernate mới tự tạo bảng.

## I. Cấu hình sản xuất
Không dùng `sa`, không cấp `db_owner` lâu dài. Đổi `DB_DDL_AUTO=validate`, dùng Flyway/Liquibase để migrate, bật xác minh chứng thư TLS, không public SQL Server, giữ secret trong secret manager.
