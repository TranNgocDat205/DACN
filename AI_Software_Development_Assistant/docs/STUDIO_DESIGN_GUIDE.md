# DevPilot AI — Editorial Engineering Studio

## Bản nâng cấp giao diện

Thiết kế lại frontend hiện có theo hướng giao diện studio phát triển phần mềm mang bản sắc riêng: typography mạnh, nền off-white, điều hướng navy, xanh cobalt và điểm nhấn lime. Không chỉnh sửa API, business logic, AI service hoặc database.

### Các phần đã thay đổi

- **Sidebar**: nhận diện chữ D· riêng, bố cục menu rõ ràng, trạng thái active, khối thông điệp studio, liên kết tới AI & RAG.
- **Topbar**: breadcrumb theo phân hệ, phím tắt giao diện `Knowledge` mở trang `Tài liệu & RAG`, trạng thái AI và người dùng, giữ công tắc sáng/tối đang có.
- **Dashboard**: hero riêng, sơ đồ flow tiến độ, chọn project, bốn KPI bấm được, tiến độ Sprint/Task, các yêu cầu gần đây, ba công cụ AI dẫn đến trang thật, lời mời AI Research.
- **Các trang nghiệp vụ**: cập nhật design tokens dùng chung cho panel, nút bấm, bộ lọc và biểu mẫu; không thay đổi thao tác tạo/sửa/xóa.
- **Tài liệu & RAG**: nâng cấp giao diện upload, kho nguồn chính thống, phần chat và trích dẫn. Giữ nguyên Tavily Web Search, upload và REST API hiện tại.
- **Đăng nhập**: cập nhật màu, font và hình thức trình bày.
- **Responsive**: có bố cục cho màn hình lớn, máy tính bảng và điện thoại. Hỗ trợ chế độ giảm chuyển động của hệ điều hành.

### 3 file source được sửa, 1 file mới

```text
frontend/src/main.jsx                               [sửa]
frontend/src/components/CompactSidebar.jsx           [sửa]
frontend/src/studio-redesign.css                      [thêm]
frontend/index.html                                 [sửa]
```

### Cách cập nhật

1. Sao lưu project hiện đang chạy, nhất là các file `.env`.
2. Giải nén ZIP **Changed Files** vào thư mục gốc `AI_Software_Development_Assistant` và chọn ghi đè các file trùng.
3. Không chép đè `backend/.env` hay `ai-service/.env` (bản giao diện này không chứa chúng).
4. Tại thư mục gốc project, khởi động frontend:

```powershell
cd frontend
npm install
npm run dev
```

5. Nếu Backend và AI Service chưa chạy, mở Terminal khác và chạy các script hiện có từ thư mục gốc:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
```

Vào `http://localhost:5173`, đăng nhập và thử: Dashboard → AI Xung đột → AI Mô phỏng → AI Truy vết → Tài liệu & RAG → Kanban. Số liệu trên Dashboard là số liệu thực từ API của Project.

### Tệp demo xem trước

`preview/Studio_Preview.html` là **bản xem trước tĩnh** có số liệu minh họa. Không được dùng làm ứng dụng thay thế. Bản hoạt động thật là giao diện React trong `frontend/src/`.

### Những phần không thay đổi

Backend Java/Spring Boot, Python/FastAPI, SQL Server, JWT, Tavily và các API RAG vẫn giữ nguyên. Giao diện không yêu cầu thư viện npm mới, không cần migration database.

### Kiểm tra

- Kiểm tra cú pháp JSX bằng TypeScript parser (`tsc --allowJs --jsx preserve --noEmit --noResolve`) đã qua.
- CSS mới đã được render kiểm tra trực quan trong trình duyệt Chromium bằng bản xem trước tĩnh.
- Layout xem trước 390 px không tràn ngang.
- Môi trường đóng gói không có đủ npm packages để chạy được `vite build`, do đó **chưa xác nhận build/frontend tích hợp API thật trên máy người dùng**. Hãy chạy `npm install && npm run build` ở frontend để xác nhận lần cuối.

## Palette & typography

- Navy `#172638`: hero điều khiển dự án
- Paper `#f7f6f2`: canvas
- Ink `#172335`: chữ chính
- Cobalt `#3d55e8`: điều hướng và hành động
- Lime `#d5f678`: điểm nhấn đặc trưng
- Typography: Space Grotesk, DM Sans, IBM Plex Mono (fallback system fonts khi không có mạng)

## Lưu ý bảo mật

Không thêm file `.env`, API key hoặc mật khẩu vào gói ZIP hay repo. Nếu khóa từng được chia sẻ công khai, hãy thu hồi và thay mới trước khi sử dụng.
