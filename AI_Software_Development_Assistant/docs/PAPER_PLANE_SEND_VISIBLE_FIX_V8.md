# DevPilot – Sửa dứt điểm hiệu ứng máy bay giấy khi gửi Chat AI (V8)

Nguồn hiệu ứng: Lucian UX/UI Prompt #005 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#005.

## Nguyên nhân trước đây
- `PaperPlaneComposer` chờ `sendAttempt` cập nhật mới phát hiệu ứng. Tùy đường đi JSX/state, dễ bỏ lỡ lần gửi hoặc hiệu ứng chạy muộn.
- Máy bay nằm bên trong `.chat-panel` có `overflow: hidden`, lớp xếp chồng và CSS nhiều thế hệ của Dashboard có thể che nó.
- Tình trạng gửi không được đồng bộ trực tiếp với Promise trả về từ API.

## Sửa lần này
1. Hiệu ứng bắt đầu **ngay trong onSubmit** của form, áp dụng cho cả Enter và click.
2. SVG máy bay + vệt sáng hiển thị qua React Portal trực tiếp tới `document.body`, dùng `position:fixed` và `pointer-events:none`, không bị `overflow:hidden` của Chat cắt.
3. Chuyến bay 1.5 giây; nút hiện tiến trình khi AI xử lý lâu hơn. Dấu kiểm **chỉ** hiện khi Promise gửi Chat thật trả kết quả; nếu lỗi thì dấu X.
4. Vẫn giữ input React controlled, checkbox nguồn chính thống, URL `/projects/${projectId}/chat`, JWT và logic messages. Không chỉnh Backend/AI/database.
5. Có fallback `prefers-reduced-motion: reduce`, không tạo bay liên tục; vẫn gửi được bình thường.
6. Khi rời component, hủy requestAnimationFrame và timeout, tránh animation mồ côi.

## File đã chỉnh
- `frontend/src/main.jsx`: trả về kết quả thành công/thất bại từ hàm submit, không phụ thuộc sendAttempt.
- `frontend/src/components/PaperPlaneComposer.jsx`: khởi động hiệu ứng trực tiếp; SVG portal toàn màn hình; xử lý Promise.
- `frontend/src/components/PaperPlaneComposer.css`: lớp phủ nổi trên trang, màu/timing/fallback.

## Cài đặt trong thư mục Downloads
Giải nén bản `Changed-Files.zip` vào `C:\Users\datro\Downloads` (không giải nén vào trong thư mục `AI_Software_Development_Assistant` một lần nữa). Ghi đè 3 file Frontend theo đường dẫn gốc.

```powershell
cd C:\Users\datro\Downloads\AI_Software_Development_Assistant\frontend
npm run build
npm run dev
```

Vào `http://localhost:5173` → DevPilot → chọn Project → **Tài liệu & RAG**. Dùng `Ctrl+Shift+R` để tải lại.

## Kiểm tra khi vẫn chưa thấy hiệu ứng
1. Mở DevTools → Console và thử gửi một câu hỏi. Nếu trình duyệt bật **Reduce motion**, hãy tạm tắt để kiểm tra animation (chế độ Reduce motion cố ý không vẽ chuyến bay).
2. Khi nhấn Gửi, trong tab Elements sẽ xuất hiện trực tiếp dưới `body` một phần tử `div.u005-flight-layer` trong khoảng 1.5 giây. Nếu không xuất hiện: kiểm tra có giải nén nhầm vị trí hoặc đang chạy server Frontend từ `Documents` hay không.
3. Trong PowerShell chạy: `Select-String -Path .\src\components\PaperPlaneComposer.jsx -Pattern 'document.body|buildRoute'` để kiểm tra đúng bản vá.
4. Nếu Frontend hoạt động nhưng API trả lỗi thì vẫn nhìn thấy máy bay trước khi xuất hiện dấu X; không cần AI hoạt động thành công để thấy animation.
5. Trên điện thoại, SVG phủ toàn viewport và nút Send vẫn thao tác bằng Enter và click/touch.

## Kiểm thử đã thực hiện
- Parser TypeScript JS/JSX và PostCSS: đạt.
- Kiểm tra đường dẫn import nội bộ: đạt.
- **Smoke test trong Chromium với chính component React** (API giả lập): click phát bay ngay, 0,25 giây có Portal; sau 1,7 giây chuyển chờ, sau 2,7 giây mới hiện dấu kiểm khi API trả về.
- **Trường hợp API lỗi**: dấu X và không hiện thành công.
- **Mobile 390px**: vẫn thấy lớp bay, không có lỗi JavaScript.
- **Reduce Motion**: không có lớp bay, gửi thành công và hiện trạng thái cuối.
- **Chưa xác nhận production build Vite** trong môi trường này (`npm ci` bị timeout), hoặc request AI/RAG thật trên máy Windows của bạn. Cần chạy `npm run build` và kiểm thử trực tiếp.
