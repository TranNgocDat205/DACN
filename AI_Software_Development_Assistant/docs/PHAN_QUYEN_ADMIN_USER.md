# Nâng cấp phân quyền ADMIN / USER — DevPilot AI

## Phạm vi

Dự án có **hai cấp quyền độc lập**:

- **Quyền tài khoản** (`app_users.system_role`): `ADMIN` / `USER`.
- **Quyền dự án** (`project_members.role`): `OWNER` / `MEMBER` (giữ nguyên dữ liệu cũ).

| Hành động | ADMIN | USER là OWNER | USER là MEMBER | USER ngoài dự án |
|---|---|---|---|---|
| Danh sách dự án | Tất cả | Dự án tham gia | Dự án tham gia | Không thấy dự án khác |
| Tạo dự án mới | Có | Có | Có | Có |
| Xem các mục Requirements, Stories, Sprint, Task, RAG | Mọi dự án | Dự án của mình | Dự án được chia sẻ | Không (403) |
| Thêm/sửa/xóa nghiệp vụ, tải tài liệu và hỏi AI | Mọi dự án | Dự án của mình | Dự án được chia sẻ | Không (403) |
| Đổi tên dự án, mời thành viên | Mọi dự án | Dự án của mình | Không (403) | Không (403) |
| Xem danh sách tài khoản toàn hệ thống | Có | Không (403) | Không (403) | Không (403) |
| Cấp/thu hồi quyền ADMIN | Có (trừ chính mình) | Không (403) | Không (403) | Không (403) |

Các ràng buộc đã giữ:
- Không cho tự đăng ký bằng role `ADMIN`: mọi tài khoản đăng ký mới đều là `USER`.
- API `/api/admin/**` kiểm tra quyền ở Backend qua DB, không dựa vào hiển thị frontend.
- Không thể tự hạ quyền Admin của chính mình. Hệ thống cũng ngăn hạ quyền Admin cuối cùng.
- Backend trả 401 khi thiếu đăng nhập và 403 khi không đủ quyền.
- **Chủ dự án OWNER không đồng nghĩa với quản trị viên hệ thống ADMIN.**

## Nâng cấp trên máy của bạn

1. **Sao lưu database** `AI_Software_Assistant` bằng SSMS (Database > Tasks > Back Up).
2. Dừng Spring Boot (Ctrl+C). Chạy `database/04-add-admin-user-roles.sql` trong SSMS. Script thêm `app_users.system_role`, gán `USER` cho tài khoản hiện tại và không thay `project_members`.
3. Mở `database/05-promote-first-admin.sql`, sửa `REPLACE_WITH_YOUR_REGISTERED_EMAIL@example.com` thành **email tài khoản đã đăng ký do bạn quản lý**. Chạy trong SSMS. Không chèn mật khẩu hay API key vào file SQL.
4. Khởi động Backend và Frontend từ thư mục dự án như bình thường:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
   ```
   Ba lệnh chạy ở **ba Terminal riêng**. Nếu AI Service đã chạy, không mở phiên mới cùng cổng 8000.
5. Đăng xuất rồi đăng nhập lại (hoặc tải lại trang). Tài khoản ADMIN sẽ thấy mục **Quản trị tài khoản** ở menu bên trái. Tại đây Admin cấp/thu hồi quyền `ADMIN` cho tài khoản khác.
6. Tài khoản USER không thấy menu quản trị, và gọi API quản trị thủ công vẫn nhận 403.

### Kiểm tra nhanh trong SSMS

```sql
USE AI_Software_Assistant;
GO
SELECT id, name, email, system_role FROM dbo.app_users ORDER BY id;
SELECT project_id, user_id, role FROM dbo.project_members ORDER BY project_id;
```

### Kiểm tra API an toàn

- Đăng nhập ADMIN và truy cập menu **Quản trị tài khoản**: thấy danh sách tên, email, quyền; không thấy mật khẩu/hash.
- Đăng nhập USER và gọi `GET /api/admin/users`: phải nhận **403**.
- USER mở dự án được mời: mở được trang quản lý; USER ngoài dự án: **403**.
- Admin thay USER A thành ADMIN: A tải lại trang sẽ thấy menu Quản trị.
- Admin thu hồi quyền một Admin khác: API quản trị của người bị thu hồi phải trả **403** ngay cả khi dùng JWT cũ.
- Không thay đổi quyền `project_members` OWNER/MEMBER khi cấp quyền tài khoản.

## Những giới hạn và khuyến nghị

- Để phục vụ phạm vi đồ án, ADMIN có quyền truy cập mọi dự án kể cả các tài liệu RAG trong dự án; đây là quyền nhạy cảm, chỉ cấp cho tài khoản tin cậy.
- Tùy nhu cầu vận hành, có thể bổ sung nhật ký quản trị, vô hiệu hóa tài khoản, xác thực hai yếu tố, nhóm quyền chi tiết (read/write), và chính sách bảo vệ Admin cuối cùng ở mức transaction khi có nhiều Backend chạy đồng thời.
- Không triển khai Quick Tunnel công khai với dữ liệu thật nếu chưa có bảo vệ lớp ứng dụng và cấu hình môi trường production.
- Nếu frontend trên Cloudflare vẫn gọi `http://localhost:8080`, kiểm tra `VITE_API_URL=/api` ở frontend/.env và cấu hình proxy Vite. Bản vá quyền không thay file `.env` hiện có.
- Không gửi file `.env`, JWT, SQL password hay FastRouter API key khi chia sẻ mã nguồn hoặc log.
