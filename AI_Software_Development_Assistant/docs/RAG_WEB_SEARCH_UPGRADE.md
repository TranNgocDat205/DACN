> **Bản hiện tại dùng Tavily mặc định.** Xem `docs/TAVILY_RAG_SETUP.md` để biết hướng dẫn mới. Phần dưới đây chỉ mô tả phiên bản Brave trước đây, được giữ lại làm tư liệu.

# DevPilot AI Web Search + RAG — nguồn chính thống (10/2026)

## Mục tiêu và những gì đã triển khai

- Tìm tài liệu theo truy vấn tự do, ví dụ **`AI Software Testing best practices`**.
- Với **Brave Search API key**, ứng dụng truy vấn nhiều trang trong **các tên miền chính thức đã được quản trị viên chấp thuận**, không còn giới hạn ở 25 URL cố định.
- Nguồn hỗ trợ: OWASP (owasp.org, cheatsheetseries.owasp.org), NIST (csrc.nist.gov, pages.nist.gov), GitHub Docs, Microsoft Learn, React, Spring, Python, FastAPI, Scrum Guides, MDN, W3C và TypeScript.
- Tìm kiếm trả `title`, `url`, `publisher`, `snippet`, `credibility`, `status=search_candidate`, `verified=false`. **Kết quả tìm kiếm không được xem là tài liệu đã xác minh.**
- Nút **Thêm RAG** mới đọc HTML tại **URL chính gốc** rồi mới lưu các chunk và dấu thời gian `fetchedAt` theo Project. Có thể xem link nguồn trong giao diện chat.
- Chat RAG tùy chọn tìm trực tuyến: khi có Brave key, tìm trang động trong cùng danh mục domain; khi không có key, thử tìm trong danh mục cũ, đồng thời trả cảnh báo để không gây hiểu lầm.
- Không tự động thêm nguồn web vào Project khi người dùng chỉ hỏi qua chat; chỉ nhập vào DB nếu người dùng chọn **Thêm RAG**.

## Cấu hình (Windows / VS Code)

1. **Sao lưu** mã nguồn và SQL Server. Giải nén ZIP chỉ file thay đổi vào đúng thư mục gốc dự án (hoặc dùng ZIP hoàn chỉnh).
2. Mở file **`ai-service/.env`** đang dùng và bổ sung:

   ```env
   BRAVE_SEARCH_API_KEY=KEY_LAY_TU_TAI_KHOAN_BRAVE_SEARCH_API
   ```

   Đây là **khóa Brave Search API**, **không phải** `AI_API_KEY` của FastRouter. Đăng ký ở trang Brave Search API để lấy khóa; việc đăng ký, hạn mức hoặc tính phí phụ thuộc dịch vụ. Không đưa khóa vào Git, frontend hoặc ảnh chia sẻ.

3. Giữ nguyên `AI_INTERNAL_KEY` ở hai service, JWT, database settings và AI model đã có. Nếu cập nhật từ phiên bản cũ, nên để `DB_DDL_AUTO=update` trong `backend/.env`.
4. Dừng cả ba service, khởi động lại bằng PowerShell ở thư mục gốc:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
   powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
   ```

5. Chọn một Project → **Tài liệu & RAG** → tìm `AI Software Testing best practices` → xem nguồn, link gốc và đánh giá uy tín theo domain → **Thêm RAG** → thử hỏi chat cùng chủ đề và kiểm tra `sources[]`.

**Nếu chưa có Brave key:** Giao diện vẫn hoạt động trong chế độ **danh mục 25 trang** và **hiển thị cảnh báo**. Không có cơ chế tìm kiếm toàn bộ tên miền khi khóa trống. API Chat vẫn có thể đọc một vài trang danh mục cũ. Không có thư viện Python hay lệnh `pip` mới; sử dụng `httpx` đã có.

**Nếu API `/api/projects/{id}/documents` trả HTTP 500:** xem log Spring Boot, xác định database đang chạy. Nếu báo thiếu `source_type`, `source_url`, `publisher` hoặc `fetched_at`, chạy script tùy chọn `database/06-rag-official-source-columns.sql` trên đúng database. Script không xóa tài liệu cũ. Tránh tự thay đổi database khi log không xác nhận lỗi cột.

## REST API

Các API Java yêu cầu JWT hợp lệ + `ProjectAccess`:

| Method | Backend API | Ý nghĩa |
|---|---|---|
| POST | `/api/projects/{projectId}/official-sources/discover` | `{"query":"AI Software Testing best practices","limit":12}`. Tìm URL chính thức qua Brave Search. |
| POST | `/api/projects/{projectId}/official-sources/import-url` | `{"url":"https://owasp.org/..."}`. Kiểm tra allowlist, tải HTML, lập chỉ mục theo Project. |
| POST | `/api/projects/{projectId}/official-sources/search` | Danh mục 25 URL truyền thống, vẫn tương thích bản cũ. |
| POST | `/api/projects/{projectId}/official-sources/import` | Nhập tài liệu bằng ID của danh mục cũ. |
| POST | `/api/projects/{projectId}/chat` | `{"question":"...","includeOfficialSources":true}`. RAG + tùy chọn tra cứu web trực tiếp. |
| GET | `/api/projects/{projectId}/documents` | Danh sách tài liệu đã nhập. |
| DELETE | `/api/projects/{projectId}/documents/{id}` | Xóa tài liệu khỏi RAG Project. |

FastAPI nội bộ: `/rag/official/discover`, `/rag/official/import-url`, `/rag/official/catalog`, `/rag/official/import`, `/rag/chat`. **Tất cả yêu cầu `X-Internal-Key`.**

## Kiến trúc và đánh giá nguồn

`React → Spring Boot JWT/ProjectAccess → FastAPI internal-key → Brave Search API (chỉ site:<approved host>) → lọc whitelist URL → tải HTTPS HTML → chunk + embed → index riêng Project → RAG answer + sources`.

- Danh sách hostname được cố định tại `ai-service/web_discovery.py`. Chỉ chấp nhận **HTTPS và đúng hostname**, không wildcard hoặc subdomain tùy ý; tự bỏ fragment; từ chối hostname giả mạo, credential trong URL, IP nội bộ và cổng khác mặc định.
- Brave Search là **chỉ mục bên thứ ba**, có thể bỏ sót URL hoặc xếp hạng không phù hợp. Ứng dụng chỉ gửi **truy vấn**, không gửi nội dung tài liệu Project cho Brave; nội dung đưa vào LLM được xử lý theo chính sách dữ liệu AI hiện có.
- **Điểm uy tín 80–95/100** là thước đo *dấu hiệu nguồn* có công thức công khai (hostname cho phép + HTTPS + đường dẫn mang dấu hiệu docs/guides + đã tải HTML thành công). **Không phải chứng nhận độ đúng, tính cập nhật hay độ tin cậy học thuật của một bài viết.**
- Tải tài liệu: không theo redirect, từ chối nội dung không phải HTML, giới hạn 2 MB, timeout và loại bỏ script/style/nav bằng HTML parser. Bất kỳ lỗi fetch nào cũng ngăn nhập tài liệu và không tạo citation giả.
- Văn bản web được xem là dữ liệu **không tin cậy** trong prompt cho LLM; không tuân theo chỉ dẫn trên website. Nếu LLM không có API key, chỉ trả các đoạn trích đã truy xuất kèm URL thay vì sinh kết luận giả.
- Các tài liệu nhập được lưu tại `ai-service/data/<projectId>/index.json` (không kèm trong ZIP). **Tài liệu từ website có thể thay đổi:** `fetchedAt` chỉ biểu thị thời điểm lập chỉ mục; muốn cập nhật, hãy xóa và nhập lại.
- Chưa hỗ trợ PDF web, JavaScript-rendered websites, trang cần đăng nhập, robots/captcha, hoặc tìm kiếm trên toàn bộ Internet. Nếu site redirect, tải thất bại có cảnh báo — người dùng có thể mở link gốc để kiểm tra thủ công.
- Tên miền chính thức chỉ là bằng chứng về chủ thể xuất bản, không bảo đảm bài viết đáp ứng yêu cầu pháp lý hoặc tiêu chuẩn ISO. Kết quả liên quan cần người dùng đánh giá.

## Tests và giới hạn xác minh

```powershell
cd ai-service
python -m pytest -q
```

Bộ test mới mock Brave Search và HTML network, bao gồm: nguồn giả mạo, hostname không hợp lệ, SSRF, import thất bại, dedupe, project isolation, citations và fallback không có API key. **Không thực hiện thử nghiệm Brave API/SQL Server/LLM live** trong môi trường tạo ZIP. Hãy chạy end-to-end trên máy bạn, đặc biệt với `GET /api/projects/{id}/documents` và tìm kiếm có khóa thật.
