# DevPilot AI — AI Software Development Assistant

DevPilot hỗ trợ quản lý Project, Requirement, User Story, Acceptance Criteria, Sprint, Task/Kanban, thành viên, quản trị tài khoản, RAG từ tài liệu và AI phân tích yêu cầu.

## Bản nâng cấp Engineering Intelligence (10/2026)

Có **3 tính năng mới** hiển thị trong sidebar của Project:

1. **AI Requirement Conflict Detector** — phát hiện xung đột/trùng lặp yêu cầu giữa các Requirement, đánh giá và duyệt cảnh báo.
2. **AI Change Impact Simulator** — mô phỏng thay đổi Requirement, truy vết tới Story/AC/Task/Sprint từ SQL Server, xem gợi ý AI, chủ động xác nhận và lưu lịch sử chỉnh sửa.
3. **AI Requirement-to-Release Traceability** — theo dõi các liên kết thật giữa các giai đoạn và xác nhận kết quả QA thủ công để tính trạng thái sẵn sàng theo quy tắc.

**Đọc đầy đủ:** [`docs/ENGINEERING_INTELLIGENCE.md`](docs/ENGINEERING_INTELLIGENCE.md) — hướng dẫn cài đặt, chạy, giải thích AI, API mới và các trường hợp thử nghiệm.

## Nâng cấp RAG từ nguồn chính thống (10/2026)

Trong mục **Tài liệu & RAG**, có thêm **Kho tài liệu chính thống** để tra theo từ khóa trên danh mục các nhà phát hành NIST, OWASP, Scrum Guides, React, Spring, Python, Microsoft Learn... Có thể **Thêm RAG** sau khi tải và xác minh nội dung, hoặc bật **Tra cứu trực tuyến** ngay trong chat. Mỗi nguồn được trích kèm URL, nhà xuất bản và thời gian tải.

Tính năng sử dụng danh mục chọn lọc 25 trang, **không phải công cụ tìm kiếm toàn Internet**; không chấp nhận nhập URL tùy ý. Trang không truy cập được sẽ không được coi là nguồn đã xác minh. Backend thêm bốn cột nguồn cho bảng documents; cấu hình `.env` không cần thay đổi, chỉ giữ `DB_DDL_AUTO=update`.

Hướng dẫn: [`docs/RAG_OFFICIAL_SOURCES.md`](docs/RAG_OFFICIAL_SOURCES.md).

## Khởi động

- Yêu cầu: Windows PowerShell, JDK 21+, Maven, Node.js, Python 3.11+, Microsoft SQL Server.
- Nếu nâng cấp từ bản cũ: sao lưu source và database, **giữ nguyên file `.env` cũ**. Chỉ ghi đè những file trong ZIP bản vá.
- Nếu dùng ZIP toàn bộ: tạo `ai-service/.env` từ `ai-service/.env.example` và `backend/.env` từ `backend/.env.example`. Tự nhập khóa AI, mật khẩu SQL, JWT secret; đặt `DB_DDL_AUTO=update` để tạo 4 bảng mới khi khởi động backend. Hai nơi phải dùng cùng `AI_INTERNAL_KEY`.
- Mở ba terminal tại thư mục dự án, lần lượt chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
```

Sau đó mở http://localhost:5173.

## Bảo mật và dữ liệu

Hai ZIP **không chứa** `.env`, token, API key, mật khẩu, virtual environment, `node_modules`, build output hay dữ liệu SQL cục bộ. Việc tách cấu hình ra khỏi bản ZIP nhằm tránh rò rỉ khóa bí mật. Không nên commit hoặc gửi những file cấu hình chứa mật khẩu.

Nếu không cấu hình khóa LLM, giao diện chỉ đưa ra kết quả chắc chắn bằng quy tắc/quan hệ database, kèm cảnh báo rằng chưa có phân tích AI ngữ nghĩa. Không tự giả lập đánh giá của mô hình AI.

Không nên sử dụng tính năng “Đủ điều kiện” như quyết định phát hành tự động. Kết quả QA `PASSED` trong tính năng truy vết là **xác nhận thủ công**, không phải chạy bộ test tự động.

## Nâng cấp AI Web Search + RAG

DevPilot hỗ trợ tìm URL mới trong các tên miền tài liệu chính thức qua Tavily Search API (ưu tiên) hoặc Brave Search API (tương thích bản cũ), nhập trang HTML đã truy cập thành công vào RAG của Project và trả lời với URL gốc. Mở **`docs/TAVILY_RAG_SETUP.md`** để cấu hình `TAVILY_API_KEY` và xem các giới hạn. Khi chưa có khóa, hệ thống vẫn tìm trong danh mục 25 trang trước đó, nhưng **không tìm web động**.
