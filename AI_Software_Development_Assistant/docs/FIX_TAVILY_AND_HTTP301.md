# Fix: Tavily không bật & HTTP 301 Microsoft Learn

## Triệu chứng
- `Tìm web mở rộng chưa bật; chỉ tra cứu trực tuyến trong danh mục nguồn cũ.`
- `Không đọc được Microsoft Learn: Official page returned HTTP 301; not indexed`

Đây là hai vấn đề khác nhau:

1. **Tavily chưa được nạp vào tiến trình AI Service**. Tìm kiếm web mở rộng chỉ bật khi tiến trình Python nhận được `TAVILY_API_KEY` hoặc (dự phòng) `BRAVE_SEARCH_API_KEY`. Script `scripts/Start-AI.ps1` đọc `ai-service/.env` khi khởi động. Sau khi chỉnh `.env` phải dừng AI Service và khởi động lại. Nếu key đã được cấu hình nhưng hết hạn, `/health` chỉ kiểm tra cấu hình, không kiểm tra key có hoạt động thực tế; hãy thử tìm web và xem thông báo HTTP 401/403/429.
2. **Trang chính thức trả HTTP 301**. Bản trước chặn toàn bộ chuyển hướng. Bản vá cho phép tối đa 3 lần chuyển hướng, mỗi đích đều được xác minh lại: phải là HTTPS và hostname thuộc danh sách phê duyệt. Redirect ra domain lạ, IP nội bộ, HTTP, redirect loop và quá 3 lần đều bị chặn. Nếu trang mới trả PDF hoặc không đủ HTML vẫn không được index.

## Cài bản vá
1. Đảm bảo đang chạy bản DevPilot có Tavily Web Search. Sao lưu thư mục hiện tại.
2. Giải nén ZIP bản vá vào thư mục gốc `AI_Software_Development_Assistant` (cùng cấp `backend`, `ai-service`, `frontend`, `scripts`). Sao chép và ghi đè file cùng đường dẫn.
3. **Không ghi đè `.env`**. Mở `ai-service/.env` và thêm/cập nhật:
   ```env
   TAVILY_API_KEY=YOUR_NEW_TAVILY_API_KEY
   ```
   Không đặt API key trong frontend hoặc mã nguồn. Nếu key từng bị chia sẻ, hãy thu hồi và tạo key mới trên Tavily.
4. Dừng AI Service cũ (Ctrl+C) và chạy từ thư mục gốc dự án:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
   ```
5. Kiểm tra trạng thái:
   ```powershell
   Invoke-RestMethod http://127.0.0.1:8000/health | Select-Object web_search_provider,web_search_configured
   ```
   Kết quả kỳ vọng khi cấu hình đúng: `tavily` / `True`.
   Nếu thấy `catalog_only` / `False`: kiểm tra có đúng file `ai-service/.env`, đúng tên biến, đúng tiến trình/port 8000 rồi khởi động lại.
6. Mở DevPilot > Tài liệu & RAG > tìm `AI Software Testing best practices` > Thêm RAG. Với chế độ chat, bật tra cứu trực tuyến.

## Giới hạn & bảo mật
- `/health` không tiết lộ key, chỉ xác nhận biến môi trường tồn tại. Không khẳng định Tavily key hợp lệ, còn quota hay truy cập được Tavily.
- Bản vá không chấp nhận URL tự do ngoài domain allowlist và không vượt chặn SSRF.
- Không phải trang nào cũng có thể đọc: PDF, trang yêu cầu JS/đăng nhập, redirect sang domain chưa phê duyệt vẫn bị từ chối.
- Chỉ dùng trang đã tải thành công làm trích dẫn RAG.
- Bản vá chỉ sửa Python AI Service, không yêu cầu migrate SQL hoặc sửa Spring Boot.

## Kiểm thử
Chạy từ `ai-service`:
```powershell
python -m pytest -q
```
Kiểm thử offline (mock HTTP), không phát sinh chi phí Tavily. Đã kiểm tra 41 bài đạt trên source tại thời điểm đóng gói. Chưa xác minh trực tiếp API key trên máy người dùng.
