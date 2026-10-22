# DevPilot: Tavily Web Search + RAG (10/2026)

## Thay đổi chính

- **Tavily Search** là dịch vụ tìm kiếm ưu tiên thay cho Brave trong AI Service.
- Một yêu cầu `POST https://api.tavily.com/search` cho mỗi lần tìm; sử dụng `search_depth=basic` để hạn chế lượng credits, `include_domains` giới hạn 8 tên miền chính thức phù hợp nhất với truy vấn.
- **Brave Search là tùy chọn dự phòng** nếu bạn đã cấu hình Brave nhưng không cấu hình Tavily. Không tự động tiêu tốn Brave credits khi Tavily lỗi/đã hết quota.
- Các API Spring Boot, dữ liệu và giao diện hiện có được giữ nguyên. Hỗ trợ tìm kiếm `AI Software Testing best practices`.
- Tavily trả kết quả ở trạng thái **ứng viên**. URL phải đúng HTTPS + hostname allowlist tại `ai-service/web_discovery.py`. Chỉ khi đọc HTML thật từ URL đó thành công mới thêm vào kho RAG hoặc đưa vào chat như trích dẫn.
- Tài liệu được lưu riêng theo Project. Các chế độ AI Engineering Intelligence trước đây được giữ nguyên.

## Bảo vệ khóa bí mật

Nếu từng dán API key vào tin nhắn, ảnh, kho mã hoặc ticket, hãy **thu hồi/đổi (rotate) key** trong tài khoản Tavily và sử dụng khóa mới. Không gửi khóa trong chat, gửi mã nguồn, tạo commit hoặc để trong frontend.

1. Mở hoặc tạo file **`ai-service/.env`** trên máy của bạn (được loại trừ khỏi ZIP).
2. Thêm một dòng với khóa thực của **bạn**, tuyệt đối không dán vào source code:

   ```env
   TAVILY_API_KEY=your_new_tavily_key_here
   ```

3. Nếu có `BRAVE_SEARCH_API_KEY` cũ, có thể để nguyên hoặc xóa. **Tavily được ưu tiên khi cả hai cùng có**.
4. Giữ nguyên `AI_INTERNAL_KEY`, `AI_API_KEY`, `AI_BASE_URL` và các cấu hình SQL Server đang sử dụng. File `ai-service/.env.example` chỉ có giá trị mẫu.

## Khởi động trên Windows, từ thư mục gốc DevPilot

Mở 3 terminal riêng, dừng các tiến trình cũ bằng Ctrl+C:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
```

Không cần thư viện Python bổ sung: ứng dụng dùng `httpx` đã có trong `requirements.txt`.

## Thử trực tiếp trên giao diện

1. Mở `http://localhost:5173`, đăng nhập, chọn Project.
2. Vào **Tài liệu & RAG**, nhập `AI Software Testing best practices` rồi nhấn tìm.
3. Kiểm tra publisher, URL, nhãn chưa xác minh và tín hiệu uy tín theo tên miền.
4. Bấm **Thêm RAG** cho một kết quả để tải HTML thực từ nguồn chính thức.
5. Trong chat bật **Tra cứu trực tuyến từ tên miền chính thống** để tìm thêm khi hỏi. Trả lời chỉ có trích dẫn khi hệ thống đã tải trang thành công.
6. Nếu không tìm được kết quả, xem phần cảnh báo (ví dụ `Tavily Search HTTP 401/403/429`: khóa hết hiệu lực/hạn mức).

Nếu chưa cấu hình `TAVILY_API_KEY` hoặc Brave key, tìm kiếm dùng danh mục nguồn mẫu cũ (catalog fallback), **không phải tìm web toàn mạng**.

## API và luồng dữ liệu

- `POST /api/projects/{projectId}/official-sources/discover` (`{"query":"AI Software Testing best practices","limit":12}`): Spring Boot xác thực JWT và ProjectAccess, FastAPI gửi truy vấn & các tên miền được phép sang Tavily, trả danh sách ứng viên.
- `POST /api/projects/{projectId}/official-sources/import-url` (`{"url":"https://owasp.org/..."}`): kiểm tra URL rồi tải thực tế, chunk và lưu vào RAG của Project.
- `POST /api/projects/{projectId}/chat` (`{"question":"...","includeOfficialSources":true}`): truy vấn RAG Project + tìm tài liệu trực tuyến, chỉ sử dụng các trang đọc được và cung cấp URL gốc.

`React -> Spring Boot JWT/ProjectAccess -> FastAPI internal key -> Tavily (các domain chính thức) -> lọc hostname -> fetch trang HTML từ publisher -> chunk/index/chat + citations`.

## Các giới hạn hiện tại

- Chỉ tìm trên danh sách domain chính thức được lập trình trong `ai-service/web_discovery.py`, không phải tìm toàn bộ Internet. Có thể chỉnh danh sách với thay đổi có kiểm soát.
- `include_domains` là bộ lọc bên phía Tavily, kết quả vẫn phải được validate lại ở server.
- `trust score` là tín hiệu tên miền/HTTPS, không phải kiểm chứng mức độ đúng, cập nhật hoặc tính pháp lý.
- Chỉ đọc HTML công khai, không đọc PDF web, trang cần JS/captcha/đăng nhập hoặc trang redirect bị chặn.
- API key cần mạng và hạn mức còn hiệu lực; chưa thử nghiệm live với khóa thực trong môi trường đóng gói. Không gửi dữ liệu Project cho Tavily: chỉ gửi query và allowlist domain.
- Không tự động fallback sang Brave khi Tavily 401/429 để tránh dùng credits ngoài dự kiến.

## Kiểm thử

```powershell
cd ai-service
python -m pytest -q
```

Các tests giả lập HTTP (không tiêu tốn credits), xác minh: xác thực nội bộ, lọc URL, chống URL giả mạo, 1 truy vấn Tavily, idempotent import, nguồn trích dẫn, phân tách Project và hành vi lỗi upstream.

Nếu `GET /api/projects/{id}/documents` trả HTTP 500 sau cập nhật RAG cũ, kiểm tra `Caused by` trong backend log. Chỉ dùng script `database/06-rag-official-source-columns.sql` nếu xác nhận thiếu cột của bảng `documents`.
