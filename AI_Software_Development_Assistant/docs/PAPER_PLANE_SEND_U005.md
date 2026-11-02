# DevPilot V7 – Paper Plane Send / Lucian UX/UI #005

## Vị trí được tích hợp

- `frontend/src/main.jsx` – component `Documents`, mục **Trợ lý AI & RAG**, form gửi câu hỏi.
- `frontend/src/components/PaperPlaneComposer.jsx` – component React mới, gồm ô nhập, checkbox nguồn chính thống, nút gửi và quỹ đạo máy bay giấy.
- `frontend/src/components/PaperPlaneComposer.css` – toàn bộ CSS được giới hạn trong `.u005`, màu nối với các biến theme đang có.

## Hành vi

- Nhấn nút Gửi hoặc Enter trong ô nhập: giữ nguyên request `POST /api/projects/{projectId}/chat`, JWT tự động do `api()` trong `main.jsx` xử lý.
- Dòng chat của người dùng xuất hiện ngay; máy bay giấy bay vòng khoảng 1,5 giây và để lại vệt chấm, vòng tiến trình thể hiện trạng thái đang gửi.
- Khi request thành công: dấu tích xanh xuất hiện. Khi thất bại: dấu X đỏ. Thông báo lỗi vẫn do hệ thống `notify()` hiển thị.
- Checkbox tra cứu trực tuyến và giới hạn 3000 ký tự được giữ nguyên. Không đưa dữ liệu demo vào giao diện ứng dụng.
- Light/Dark: màu dùng các biến CSS có sẵn trong `.u021-theme-root`/`.app-shell`; không sửa hệ thống theme hoặc CSS toàn cục.
- `prefers-reduced-motion: reduce`: bỏ quỹ đạo, giảm animation, vẫn gửi API và hiển thị trạng thái hoàn thành/thất bại.

## Cài đặt trên bản V7 trong Downloads

Giải nén bản **Changed Files** vào thư mục CHA của `AI_Software_Development_Assistant`, ví dụ `C:\Users\datro\Downloads` (giữ cấu trúc thư mục).

```powershell
cd C:\Users\datro\Downloads\AI_Software_Development_Assistant\frontend
npm ci
npm run build
npm run dev
```

## Các bài kiểm tra thủ công

1. Đăng nhập với tài khoản test, mở Project và vào `Tài liệu & RAG`.
2. Gõ câu hỏi rồi nhấn Enter, kiểm tra chỉ tạo một request chat và một message người dùng.
3. Gửi bằng nút tròn, quan sát đường bay/vệt chấm và chỉ hiển thị tick sau response thành công.
4. Thử khi AI Service tắt: giao diện báo lỗi và dấu X đỏ, không tick giả.
5. Bật/tắt checkbox nguồn chính thống và xác nhận `includeOfficialSources` trong Network Payload.
6. Đổi Dark/Light, thử chiều rộng 390px; kiểm tra focus keyboard và `prefers-reduced-motion`.

## Kết quả kiểm tra trong môi trường tạo bản vá

- Kiểm tra cú pháp TypeScript parser (JS/JSX): đạt 18 file.
- Phân tích cú pháp PostCSS: đạt 18 file.
- Kiểm tra import relative và vị trí nối vào API: đạt.
- **Chưa xác nhận** Vite production build hoặc test tích hợp gửi API thật, do `npm ci` không hoàn tất trong môi trường này.

Nguồn hiệu ứng: Lucian UX/UI Prompt #005, MIT License (c) 2026 Seokwoooo.
