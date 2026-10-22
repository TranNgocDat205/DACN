# DevPilot AI – Hướng dẫn bản sửa

## Đã sửa
- Bản dành riêng cho bạn giữ file `.env` đã gửi (gồm mật khẩu SQL/API key); không đóng gói thư viện ảo `.venv`, `node_modules`, `target`. KHÔNG CHIA SẺ ZIP công khai.
- Sửa entity tên/tiêu đề thành NVARCHAR cho dữ liệu tiếng Việt mới. Dữ liệu đã biến thành dấu `?` trong SQL Server không thể khôi phục tự động; phải nhập lại.
- Thêm `scripts/Test-FastRouter.ps1`.
- Script chạy AI/Java xác minh `.env`, xử lý đường dẫn Maven trong C:\tools và cảnh báo dùng HTTPS sai cho Uvicorn HTTP.
- Chuẩn hóa URL FastRouter trong Python.

## Thiết lập lần đầu (không xóa database đã có)
1. ZIP cá nhân đã có `backend/.env` và `ai-service/.env`, **không ghi đè bằng `.env.example`**. Nếu dựng từ source trống mới cần sao chép cấu hình mẫu.
2. Trong backend/.env nhập DB_PASSWORD đúng tài khoản ai_app; tạo JWT_SECRET mạnh.
3. Bản này đã đồng bộ `AI_INTERNAL_KEY` giữa CẢ HAI file `.env`. Có thể đổi nhưng phải đặt giống nhau và restart cả hai dịch vụ.
4. `ai-service/.env` đã giữ API key FastRouter người dùng gửi. Chỉ thay nếu key hết hạn/bị thu hồi; nếu không có key hệ thống chạy Demo Mode.
5. Khởi động SQL Server SQLEXPRESS01, sau đó mở 3 Terminal ở thư mục gốc:
   - `powershell -ExecutionPolicy Bypass -File scripts/Start-AI.ps1`
   - `powershell -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1`
   - `powershell -ExecutionPolicy Bypass -File scripts/Start-Frontend.ps1`
6. Gọi `http://127.0.0.1:8000/health`, `http://localhost:8080/api/health`; chạy `scripts/Test-FastRouter.ps1`.

## Lỗi Invalid HTTP request received
- Nếu log Uvicorn có `Invalid HTTP request received`, hãy xác nhận Backend gọi `http://127.0.0.1:8000`, không phải `https://...`.
- AI_BASE_URL dành cho FastRouter là HTTPS, hoàn toàn tách biệt với AI_SERVICE_URL nội bộ.
- Nếu vẫn lỗi, kiểm tra log của cả Backend và FastAPI, chưa thể coi là đã khắc phục hoàn toàn cho tới khi chạy thử trên máy Windows.

## An toàn
Bản ZIP cá nhân này có chứa khóa/mật khẩu trong `.env` theo yêu cầu. Không đưa ZIP hoặc `.env` lên GitHub hay gửi cho người khác. Đổi những khóa từng bị chia sẻ.
