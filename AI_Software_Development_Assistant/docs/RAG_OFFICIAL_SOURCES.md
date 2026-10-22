# DevPilot RAG: Tra cứu từ nguồn chính thống (10/2026)

## Tính năng

RAG hiện có hai luồng tài liệu:

1. **Tài liệu dự án**: người dùng tải lên PDF, DOCX, TXT hoặc MD (giới hạn 10 MB), dữ liệu được lưu theo Project.
2. **Nguồn chính thống**: tìm theo từ khóa trong **danh mục chọn lọc** của các nhà phát hành chính thức như NIST, OWASP, Scrum Guides, Spring, React, Python, FastAPI, Microsoft Learn, W3C, GitHub Docs và MDN Web Docs. Chọn **Thêm RAG** để tải trang HTML trực tiếp từ đúng URL của nhà phát hành và lập chỉ mục cho Project. Trang nào không tải được sẽ **không được ghi là đã xác minh**.

Dữ liệu từ nguồn chính thức hỗ trợ trả lời về thực hành kỹ thuật, tiêu chuẩn và hướng dẫn; chúng **không chứng minh** code của Project tuân thủ các quy chuẩn đó.

> Giới hạn quan trọng: tìm kiếm là tìm trong danh mục 25 trang chính thống được duyệt sẵn, **không phải bộ máy tìm kiếm toàn bộ Internet**. Danh mục có thể mở rộng bằng cách chỉnh `ai-service/official_sources.py` sau khi đánh giá URL. Kết quả tìm kiếm trạng thái `catalog_only` chỉ là gợi ý địa chỉ; bằng chứng thực sự được xác lập khi tải trang thành công.

## Cách sử dụng giao diện

1. Mở `Tài liệu & RAG` của **Project cần làm việc**.
2. Trong mục **Kho tài liệu chính thống**, nhập `authentication`, `Sprint`, `SQL Server`, `React`, `xác thực`... hoặc để trống để xem một số nguồn mặc định.
3. Nhấn **Thêm RAG** ở tài liệu cần sử dụng. FastAPI đọc và lập chỉ mục trang HTML; giao diện đưa tài liệu vào danh sách đã lưu cùng tên nhà xuất bản, đường dẫn và thời gian truy cập.
4. Đặt câu hỏi trong phần chat; RAG tìm trong tài liệu dự án **và những tài liệu chính thống đã lưu**.
5. Nếu không muốn nhập tài liệu trước, bật **Tra cứu trực tuyến thêm từ các nguồn chính thống** ở dưới khung chat. Hệ thống lấy tối đa 2 trang phù hợp từ danh mục trong lúc đặt câu hỏi, không tự lưu trang vào database.
6. Xem câu trả lời có các chỉ số `[1]`, `[2]` và danh sách nguồn. Nguồn web hiển thị link tới trang của nhà phát hành. Nếu không cấu hình API AI, hệ thống trả các đoạn văn bản thực sự truy xuất được, không giả tạo kết luận AI.

## Luồng hệ thống

`React > Spring Boot (JWT + kiểm tra thành viên Project) > FastAPI (internal key) > danh mục nguồn HTTPS đã khóa URL > tải HTML công khai > trích văn bản > chunking/embedding > index JSON theo Project > câu trả lời RAG có provenance`.

Các bản ghi trong bảng `documents` hiện có được mở rộng thêm bốn cột (Hibernate `DB_DDL_AUTO=update`):

- `sourceType`: `UPLOAD` hoặc `OFFICIAL` (bản ghi cũ có thể null và vẫn được coi là upload).
- `sourceUrl`: HTTPS URL từ danh mục được duyệt.
- `publisher`: nhà xuất bản chính thức.
- `fetchedAt`: thời gian trang được truy cập thành công.

FastAPI giữ thêm các trường `url`, `publisher`, `fetchedAt`, `source_type`, `sha256` trong index local. Nội dung tải từ website là **dữ liệu không tin cậy**, tuyệt đối không là chỉ thị cho mô hình. Việc hỏi trực tuyến không ghi dữ liệu ngoài ý muốn vào Project.

## API public (JWT của backend)

| Method | Path | Body | Kết quả |
|---|---|---|---|
| POST | `/api/projects/{projectId}/official-sources/search` | `{"query":"authentication","limit":10}` | Danh mục ứng viên (`catalog_only`) |
| POST | `/api/projects/{projectId}/official-sources/import` | `{"sourceId":"owasp-auth"}` | Xác minh, thêm vào RAG và trả bản ghi Document |
| POST | `/api/projects/{projectId}/chat` | `{"question":"...","includeOfficialSources":true}` | Trả lời, nguồn, cảnh báo nếu trang không đọc được |
| GET | `/api/projects/{projectId}/documents` | — | Gồm tài liệu tải lên và nguồn chính thống đã nhập |
| DELETE | `/api/projects/{projectId}/documents/{id}` | — | Xóa Document khỏi index và database |

Các endpoint nội bộ `/rag/official/catalog`, `/rag/official/import`, `/rag/chat` của FastAPI yêu cầu `X-Internal-Key`; không public port 8000 ra Internet. Frontend **không** liên lạc trực tiếp với các trang nhà xuất bản.

## Giới hạn, tính toàn vẹn và an toàn

- **Không truy cập URL tùy ý**: source ID buộc phải nằm trong danh mục tĩnh; chỉ dùng `https://` và từ chối URL lạ. Không theo redirect (3xx), loại bỏ các trang không đúng `text/html` và giới hạn nội dung phản hồi dưới 2 MB. Điều này ngăn nguồn RAG bị lợi dụng để quét nội bộ hoặc chuyển hướng sang domain khác.
- **Không khẳng định nội dung đã xác minh khi thất bại**: nếu website timeout, chặn truy cập, đổi cấu trúc HTML, không có đủ nội dung hoặc trả HTTP 3xx/4xx/5xx, API hiển thị lỗi/cảnh báo và không thêm index.
- **Tính mới của dữ liệu**: nội dung đã nhập là ảnh chụp văn bản ở thời điểm `fetchedAt`; muốn lấy bản mới hãy xóa tài liệu nguồn rồi thêm lại. Trạng thái trong danh mục không bảo đảm nội dung nguồn còn hoạt động.
- **Chỉ văn bản có thể đọc**: không hỗ trợ lấy JavaScript-rendered content, PDF từ URL, trang cần đăng nhập, website cần cookie đặc biệt hoặc tài liệu có bản quyền yêu cầu đăng nhập. PDF upload thủ công vẫn được hỗ trợ.
- **Phân quyền**: backend dùng ProjectAccess; chỉ gửi `projectId` từ backend sau khi kiểm tra JWT. Index được lưu riêng theo Project.
- **Nguồn và trích dẫn**: response `sources[]` kèm `document`, `chunk`, `excerpt`, `publisher`, `url` (nếu có), `fetchedAt`, `sourceType`; các nhãn chỉ thị `[n]` trong answer chỉ tương ứng danh sách được truy xuất, vẫn cần con người kiểm tra ý nghĩa.
- **LLM provider**: nếu bật API key, các đoạn trích được gửi tới provider để tổng hợp câu trả lời; không gửi dữ liệu dự án nhạy cảm lên API bên ngoài nếu không được phép.

## Khởi động & kiểm thử

Sử dụng ba script cũ trong 3 terminal, không cần cài dependency Python mới:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
```

Giữ `DB_DDL_AUTO=update` trong backend `.env` để thêm các cột mới. Giữ nguyên JWT secret, mật khẩu database và API key của bản đang chạy; cả hai service dùng cùng `AI_INTERNAL_KEY`. Máy chạy FastAPI cần cho phép kết nối HTTPS tới website chính thức trên cổng 443. Nếu có proxy hoặc captive portal tự chuyển hướng sang domain khác, trang sẽ không được nhập do chính sách không theo redirect.

Kiểm thử Python: `cd ai-service; python -m pytest -q`. Các bài kiểm thử mock mạng, không gọi API LLM trả phí hoặc tải nội dung internet. Vẫn cần chạy thử đầy đủ với các domain thật và SQL Server trên máy người dùng.
