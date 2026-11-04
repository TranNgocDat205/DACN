# DevPilot AI – Lucian UX/UI #103: Breadcrumb Explorer

Mẫu tham chiếu: Lucian UX/UI Prompt #103 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#103

## Phạm vi

- Thay breadcrumb chữ tĩnh `DEVPILOT / STUDIO / <Tên trang>` trong `frontend/src/main.jsx` bằng component `ProjectBreadcrumb103.jsx`.
- Bộ duyệt hiển thị dữ liệu thật từ `projects` và `tabs` / `adminTabs` của App.
- Khi chọn Project, dùng các callback `setProjectId` và `setPage('dashboard')` hiện có. Khi chọn phân hệ, chỉ gọi `setPage(id)`.
- Không thay endpoint, API request/response, JWT, RBAC, Backend, AI Service hoặc SQL Server.
- CSS được giới hạn trong `.u103` và tự đọc các CSS variables hiện có của DevPilot (`--surface`, `--brand`, `--ink`, `--line`), không ghi đè theme toàn hệ thống.
- Hoàn toàn không dùng `document.currentScript`, `innerHTML` hay dữ liệu ví dụ từ script gốc, tránh can thiệp React state.

## File thay đổi

1. `frontend/src/main.jsx` – import và gắn breadcrumb mới vào topbar.
2. `frontend/src/components/ProjectBreadcrumb103.jsx` – breadcrumb và folder explorer có tương tác.
3. `frontend/src/components/ProjectBreadcrumb103.css` – styling cô lập, responsive, dark/light, reduced motion.
4. `docs/BREADCRUMB_U103_INTEGRATION.md` – tài liệu này.

**Thư viện bổ sung:** Không có. Dùng React và Lucide hiện có.

## Cách áp dụng bản Changed Files

Giải nén vào thư mục cha chứa `AI_Software_Development_Assistant` đang dùng, chẳng hạn `C:\Users\datro\Downloads`, rồi kiểm tra ba file giao diện tồn tại. Không chép đè `.env`.

```powershell
cd C:\Users\datro\Downloads\AI_Software_Development_Assistant\frontend
Test-Path .\src\components\ProjectBreadcrumb103.jsx
Test-Path .\src\components\ProjectBreadcrumb103.css
npm ci
npm run build
npm run dev -- --port 5174
```

Mở `http://localhost:5174`, đăng nhập bằng tài khoản thử nghiệm. Nên tắt frontend cũ hoặc sử dụng cổng riêng để tránh xem nhầm phiên bản.

## Kiểm thử thủ công

1. Bấm breadcrumb `DevPilot` → xem thư mục `Dự án` (và mục quản trị nếu là Admin).
2. Bấm `Dự án` → xem các Project được trả về bởi API của tài khoản.
3. Chọn một Project → tới trang Tổng quan của Project đó.
4. Bấm tên Project → xem các phân hệ và điều hướng đến `Tài liệu & RAG` hoặc `Kanban`.
5. Kiểm tra tài khoản chỉ xem vẫn không thể thực hiện thao tác ghi ở Backend.
6. Thử dark/light, các kích thước 1440px, 390px, bấm `Esc` và bấm ngoài popover để đóng.
7. Bật `prefers-reduced-motion` → menu hoạt động bình thường và không có animation mở menu.

## Kết quả kiểm thử trong môi trường tạo bản vá

- Phân tích cú pháp: 19 file JS/JSX và 19 CSS đạt, không có import tương đối bị thiếu.
- React SSR: render thành công ở trạng thái Admin, User, và chưa có Project.
- Chromium: menu mở, chuyển Project, chuyển trang, click ngoài để đóng, Esc để đóng và phục hồi focus; ở độ rộng 390px không tràn ngang.
- Chưa xác nhận `npm run build` của toàn bộ ứng dụng và chưa kiểm thử Backend/JWT thực tế: môi trường này không tải đủ npm dependencies để chạy Vite build.
