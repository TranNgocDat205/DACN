# DevPilot AI V7 — Nexus Observatory

## Mục tiêu

Nâng cấp trải nghiệm Frontend của DevPilot V6 mà **không đổi Backend, JWT, OTP, RBAC, AI Service, SQL Server, request/response hay route**. V7 tăng chiều sâu không gian và điều hướng ngữ cảnh bằng một bản đồ số liệu Project thực tế.

## Phạm vi thay đổi

- `frontend/src/components/NexusObservatory.jsx` — component mới hiển thị chế độ Nexus toàn màn hình, 4 node, mô-đun chi tiết, điều hướng và thao tác bàn phím.
- `frontend/src/nexus-v7.css` — style V7, responsive, 3D CSS, animation và fallback giảm chuyển động.
- `frontend/src/components/MissionControl.jsx` — thêm launcher vào dashboard và cập nhật nhãn phiên bản.
- `frontend/src/main.jsx` — import CSS V7 sau V6 để áp dụng các thiết kế mới.
- `docs/NEXUS_UI_V7.md` — tài liệu này.

## Luồng dữ liệu và an toàn

`NexusObservatory` chỉ nhận `project`, `data`, `aiStatus`, `navigate` từ Dashboard hiện tại; không tự gọi API. Các KPI lấy từ `requirements`, `stories`, `tasks`, `status = DONE`. Nút mở phân hệ gọi `navigate()` có sẵn trong DevPilot. Quyền vẫn do JWT + RBAC ở Backend kiểm soát; giao diện không tự cấp quyền.

Chỉ báo AI nghĩa là **đã cấu hình**, không bảo đảm API FastRouter trả lời được. Bản preview HTML có số liệu demo và không gọi Backend.

## Accessibility và hiệu năng

- Dùng nút native có `aria-pressed`; modal `role=dialog`, `aria-modal`, phím Escape và giữ focus trong modal.
- Khi đóng modal, trả focus về nút mở. Khóa cuộn nền khi mở.
- Không có Three.js/GSAP hoặc WebGL; 3D dùng transform CSS.
- Pointer parallax dùng requestAnimationFrame và CSS custom properties, không re-render React trên từng bước rê chuột.
- Motion tự tắt khi bật `prefers-reduced-motion`, bố cục node chuyển thành lưới dễ chạm trên mobile.

## Test bản riêng trong Downloads

1. Giữ bản chính trong `Documents`, giải nén ZIP Full vào `Downloads`.
2. Nếu cần thử Backend/AI, cấu hình `backend/.env` và `ai-service/.env` trong bản test; ưu tiên một database thử nghiệm riêng. ZIP không chứa `.env` thật.
3. Chỉ kiểm thử giao diện và build:

```powershell
cd C:\Users\datro\Downloads\AI_Software_Development_Assistant\frontend
npm ci
npm run build
npm run dev
```

4. Mở `http://localhost:5173`, đăng nhập tài khoản test, vào **Tổng quan → Mở Nexus View**.
5. Test chọn từng node, cập nhật chi tiết, chuyển phân hệ, Escape, Tab, light/dark, viewport 390 / 768 / 1440 px, Reduced Motion.
6. Nếu Vite đang báo thiếu `.env` chỉ khi chạy Backend, phục hồi cấu hình test an toàn; không thay đổi env của dự án chính.

## Kiểm tra trong môi trường đóng gói

- Cú pháp JS/JSX kiểm tra bằng Babel parser; CSS kiểm tra bằng PostCSS.
- Đã kiểm tra import tương đối trong Frontend.
- Chưa xác minh `npm run build` do npm offline không đủ gói cached. Hãy chạy `npm ci; npm run build` trên Windows trước khi áp dụng vào source chính.

## Lưu ý bảo mật

Không copy `.env`, tài khoản, OTP, JWT, API key hay SQL Server production vào Git. Hai ZIP đã loại trừ các file bí mật. Nếu muốn thử luồng tạo/sửa dữ liệu, nên dùng database test độc lập.
