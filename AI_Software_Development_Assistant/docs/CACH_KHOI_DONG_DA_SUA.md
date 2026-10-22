# DevPilot AI – Bản sửa lỗi khóa nội bộ và FastRouter

## Sự cố đã xử lý

Bản ZIP người dùng gửi có `AI_INTERNAL_KEY` dạng mẫu ở cả `backend/.env` và `ai-service/.env`, nên `Start-AI.ps1` dừng ngay tại bước kiểm tra cấu hình. Bản đã sửa dùng **cùng một khóa có sẵn từ `.env` gốc** cho cả hai dịch vụ, không công khai giá trị trong tài liệu.

- Giữ nguyên `backend/.env` gồm mật khẩu SQL Server mà người dùng cung cấp.
- Giữ nguyên `ai-service/.env` gồm API key FastRouter mà người dùng cung cấp.
- Thêm `GET /internal/check` để thử xác thực nội bộ bằng `X-Internal-Key` **không gọi nhà cung cấp AI và không mất phí**.
- Script Backend gọi endpoint này nếu FastAPI đang hoạt động, báo rõ khi lệch khóa.
- Script AI tránh cài pip lặp lại nếu đã có dependencies, và cảnh báo khi cổng 8000 bị chiếm bởi tiến trình cũ.
- `scripts/Test-FastRouter.ps1` thử nội bộ trước, sau đó mới gọi AI thật (có thể tính phí).

## Quy trình chạy trên Windows / Visual Studio Code

1. Sao lưu thư mục cũ. Giải nén ZIP này vào thư mục mới; không xóa database SQL Server hiện có.
2. Trong SQL Server Configuration Manager, chắc chắn `SQL Server (SQLEXPRESS01)` đang chạy và TCP port 1433 có thể truy cập.
3. Mở 3 Terminal mới tại thư mục gốc `AI_Software_Development_Assistant`:

   **Terminal 1 – AI Service:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
   ```
   **Terminal 2 – Backend:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
   ```
   **Terminal 3 – Frontend:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
   ```

4. Giữ cả 3 Terminal đang mở. Mở trình duyệt tới http://localhost:5173.
5. Kiểm tra đường truyền từ Terminal thứ tư:
   ```powershell
   Invoke-RestMethod http://127.0.0.1:8000/health
   Invoke-RestMethod http://127.0.0.1:8080/api/health
   powershell -ExecutionPolicy Bypass -File .\scripts\Test-FastRouter.ps1
   ```

## Nếu nhận `Internal key invalid`

1. Đảm bảo bạn đang mở **đúng thư mục vừa giải nén** (không trộn bản cũ với bản mới).
2. Tắt hẳn Python FastAPI cũ ở cổng 8000 bằng Ctrl+C và tắt Backend cũ ở cổng 8080.
3. Kiểm tra `AI_INTERNAL_KEY` ở hai file `.env` bằng cách so sánh trên máy (không chia sẻ giá trị); cần giống hệt.
4. Chạy AI Service trước, rồi mới chạy Backend. Script Backend sẽ kiểm tra kết nối bằng `/internal/check`.

## Nếu hiện `Invalid HTTP request received`

- FastAPI local dùng **HTTP**, không dùng HTTPS: `AI_SERVICE_URL=http://127.0.0.1:8000`.
- FastRouter bên ngoài dùng **HTTPS**: `AI_BASE_URL=https://api.fastrouter.ai/api/v1`.
- Kiểm tra cổng 8000 không có ứng dụng cũ đang nghe; cài bản vá xong phải khởi động lại dịch vụ.

## Thông tin nhạy cảm

Theo yêu cầu, ZIP này **giữ nguyên mật khẩu SQL và API key trong các file `.env`** do người dùng tải lên. Đây là gói cá nhân; **không đăng ZIP lên GitHub hoặc gửi người khác**. Sau khi thử nghiệm, cân nhắc cấp lại key FastRouter và thay mật khẩu SQL nếu đã từng tiết lộ.

## Giới hạn

Bài kiểm thử cục bộ không xác thực được tài khoản SQL Server của bạn hoặc số dư/quyền sử dụng mô hình FastRouter thật. `AI_API_KEY` có mặt chỉ nói rằng đã cấu hình, không chứng minh cuộc gọi AI trả về thành công.
