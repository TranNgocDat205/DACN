# DevPilot V5 — JWT + RBAC (quyền quản trị & dự án)

## Kiến trúc bảo vệ

- JWT Bearer do `POST /api/auth/login` hoặc `POST /api/auth/verify-email` cấp **sau xác minh OTP**.
- JWT ký HMAC với `JWT_SECRET` trong `backend/.env`, thời hạn 24 giờ, có `sub` (ID), `role` (thông tin), `iss=devpilot`, `jti` ngẫu nhiên. **Quyền KHÔNG tin vào claim `role`**: Spring Security tải lại người dùng và vai trò **từ SQL Server trên mọi request**. Bản token JWT cũ chỉ có `sub` còn hợp lệ đến khi hết hạn, để không buộc mọi tài khoản đăng nhập lại ngay sau cập nhật.
- Route Admin `/api/admin/**` dùng `hasRole('ADMIN')` **tại lớp SecurityFilterChain** và tiếp tục kiểm tra role trong các phương thức có sẵn.
- Mọi API khác ngoài các endpoint đăng ký, OTP, đăng nhập, health yêu cầu JWT.
- Dữ liệu Project kiểm tra membership từ database: thành viên bị xóa hoặc bị hạ quyền **có hiệu lực ngay**, không cần đợi JWT hết hạn.
- Không thể tự chọn quyền `ADMIN` khi đăng ký công khai. Chỉ Admin quản lý vai trò hệ thống.

## Ma trận quyền

| Hoạt động | ADMIN | Project OWNER | MEMBER | VIEWER | Chưa đăng nhập |
| --- | --- | --- | --- | --- | --- |
| Quản lý User/Admin & tất cả Project | Có | Không | Không | Không | Không |
| Xem Project được cấp quyền | Có | Có | Có | Có | Không |
| Sửa Requirement, Story, Sprint, Task, cập nhật AI, import/delete RAG | Có | Có | Có | Không | Không |
| Xem tài liệu, RAG chat, tra cứu nguồn, truy vết | Có | Có | Có | Có | Không |
| Đổi tên Project, thêm/xóa/đổi quyền thành viên | Có | Có | Không | Không | Không |

`MEMBER` là quyền chỉnh sửa mặc định để tương thích dữ liệu cũ. `VIEWER` là vai trò mới. `OWNER` không được cấp qua endpoint thêm thành viên, mà gắn theo `projects.ownerId`. Admin có thể thay owner qua API quản trị hiện có.

## API mới

- `POST /api/projects/{id}/members` với body `{"email":"member@example.com", "role":"VIEWER"}` (hoặc `MEMBER`); chỉ owner/admin.
- `PUT /api/projects/{id}/members/{userId}/role` với body `{"role":"MEMBER"}` hoặc `{"role":"VIEWER"}`; chỉ owner/admin.
- `DELETE /api/projects/{id}/members/{userId}`; chỉ owner/admin, không được xóa chủ dự án.
- `GET /api/me` để Frontend đồng bộ role hệ thống thực tế từ Backend.

## Cài đặt vào Windows

1. **Sao lưu** thư mục source hiện tại và file `.env` của bạn.
2. Giải nén `DevPilot_JWT_RBAC_V5_Changed_Files.zip` vào thư mục gốc `AI_Software_Development_Assistant`. Dữ liệu SQL Server không bị xóa; project_members.role vốn đã tồn tại.
3. `backend/.env`: bảo đảm `JWT_SECRET` là chuỗi ngẫu nhiên bí mật **ít nhất 32 byte UTF-8**, không phải `CHANGE_ME...`. Giữ nguyên `AI_INTERNAL_KEY` đang dùng và đồng bộ với `ai-service/.env`; không thay API key.
4. Dừng Backend và Frontend cũ (Ctrl+C), khởi động lại bằng `scripts/Start-Backend.ps1` và `scripts/Start-Frontend.ps1`.
5. Chạy `cd backend; mvn test` (có thể dùng Maven Wrapper nếu đã cấu hình). Trong `frontend`, chạy `npm install` rồi `npm run build`.
6. Mở giao diện Thành viên dự án để gán `Chỉnh sửa` hoặc `Chỉ xem`.

## Kiểm thử với Postman

- Không có token: `GET /api/projects` -> **401**.
- Token MEMBER: `GET /api/admin/users` -> **403**.
- Token VIEWER: `GET /api/projects/{id}/tasks` -> **200**, `POST /api/projects/{id}/tasks` -> **403**.
- Token MEMBER: `POST /api/projects/{id}/tasks` -> **thành công** nếu dữ liệu hợp lệ; `PUT /api/projects/{id}/members/{userId}/role` -> **403**.
- Token OWNER: `PUT .../members/{userId}/role` -> **200**; không thể đặt `OWNER` qua API này -> **400**.
- Xóa VIEWER khỏi Project rồi thử JWT cũ: `GET /api/projects/{id}` -> **403**.
- Hạ ADMIN về USER rồi thử JWT cũ với `/api/admin/users` -> **403**.

## Hạn chế và bảo mật

- JWT có thời hạn 24h; chưa có refresh token, logout server-side hoặc danh sách thu hồi JWT. Xóa tài khoản hoặc thay quyền có hiệu lực ngay, nhưng **đăng xuất chỉ xóa token ở trình duyệt**. Cần rotate `JWT_SECRET` nếu phải vô hiệu hóa toàn bộ token đang hoạt động.
- Frontend đang lưu `devpilot-session` trong localStorage, có rủi ro nếu bị XSS; về lâu dài nên chuyển sang cookie HttpOnly Secure, thêm CSP và CSRF bảo vệ phù hợp.
- Dùng HTTPS khi mở ra Internet; giữ `.env`, JWT_SECRET, SMTP, API key **ngoài Git/GitHub**. Nếu khóa đã từng được chia sẻ, cần thu hồi và tạo khóa mới.
- Trước khi public production, bổ sung rate limit đăng nhập/OTP, kiểm tra CORS theo tên miền thật, log audit thay đổi quyền và giới hạn kích thước upload.
