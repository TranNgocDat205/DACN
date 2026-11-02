# DevPilot V7 — Sửa hiệu ứng gửi câu hỏi không hiển thị

## Vấn đề ở phiên bản trước

Nút máy bay giấy đã được gắn vào `Documents` trong `frontend/src/main.jsx`, nhưng animation nằm trong vùng 300×230 px của `PaperPlaneComposer` (form phía dưới chat). Vùng `chat-panel` có `overflow: hidden`, khiến quỹ đạo bị giới hạn/cắt, nhất là khi dùng trên điện thoại.

## Bản vá

- `frontend/src/components/PaperPlaneComposer.jsx`: tính toán vị trí nút và khung chat; render lớp phủ bằng `createPortal` trong `.chat-panel`; dùng `requestAnimationFrame` và `SVGPathElement.getPointAtLength()` để bay theo đường cong trên toàn khung chat; dọn animation/timer khi unmount; không thay đổi API hoặc sự kiện submit.
- `frontend/src/components/PaperPlaneComposer.css`: tạo lớp phủ hiển thị xuyên suốt chat, vệt bay, vòng tiến trình và nhãn trạng thái; giữ style trong `.u005`; hỗ trợ light/dark và giảm chuyển động.
- `frontend/src/main.jsx`: **không đổi**. Vẫn gọi `PaperPlaneComposer` và API `POST /api/projects/{projectId}/chat`, đi kèm JWT có sẵn.

## Cài bản thử nghiệm trong Downloads

Giải nén ZIP `Changed-Files` vào `C:\Users\datro\Downloads` (không phải thư mục con `frontend`). Ghi đè hai file component cũ, không chép `.env`.

```powershell
cd C:\Users\datro\Downloads\AI_Software_Development_Assistant\frontend
Test-Path .\src\components\PaperPlaneComposer.jsx
Select-String -Path .\src\components\PaperPlaneComposer.jsx -Pattern 'u005-flight-layer'
npm run build
npm run dev
```

Mở `http://localhost:5173` → đăng nhập → chọn Project → **Tài liệu & RAG** → gõ câu hỏi → nhấn nút Gửi hoặc Enter. Nhấn **Ctrl + Shift + R** để bỏ cache giao diện.

## Kết quả kỳ vọng

1. Khi gửi: máy bay sáng bay một vòng theo quỹ đạo trong **toàn bộ khung hội thoại**, để lại vệt chấm, đồng thời nút hiện vòng tiến trình.
2. Trong khi chờ: dòng `Đang gửi đến AI...` xuất hiện, và AI Chat vẫn gọi Backend theo luồng JWT cũ.
3. Sau khi API trả kết quả: dấu ✓ xanh chỉ xuất hiện khi thành công; lỗi xuất hiện dấu X đỏ.
4. Khi chọn Reduce Motion trong Windows: đường bay bị tắt, vẫn gửi câu hỏi và hiển thị trạng thái.
5. Khi rời trang hoặc đổi Project: animation được dọn, không để lại timer/event handler chạy ngầm.

## Nếu vẫn không thấy hiệu ứng

- Kiểm tra file thật trong Downloads (đừng sửa nhầm bản Documents).
- Tại `frontend`, chạy `npm run build`, quan sát lỗi nếu có.
- Mở F12 → Elements, tìm `u005-flight-layer`. Nếu không thấy, component mới chưa được tải vào trang.
- Trong F12 → Network, kiểm tra request `POST /api/projects/{id}/chat` để tách lỗi animation khỏi lỗi AI.
- Nếu Windows bật **Animation effects: Off** / **Reduce motion**, ứng dụng sẽ tôn trọng thiết lập này và tắt quỹ đạo.

**Lưu ý:** Đây là bản vá Frontend. Không thay đổi Backend, JWT, SQL Server hay AI Service. Kết quả AI phụ thuộc cấu hình FastRouter/RAG của máy bạn.
