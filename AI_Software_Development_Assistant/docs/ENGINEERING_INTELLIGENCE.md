# DevPilot Engineering Intelligence — 3 tính năng AI mới

## Phạm vi bản cập nhật

Bản cập nhật bổ sung **3 trang mới** trong menu không gian làm việc:

1. **AI · Xung đột yêu cầu**: so sánh tối đa 50 Requirement trong Project, phát hiện mâu thuẫn/trùng lặp/phụ thuộc/điểm thiếu rõ ràng, lưu cảnh báo và trạng thái người dùng đã xác nhận.
2. **AI · Mô phỏng thay đổi**: nhập phiên bản Requirement mới, xem bản đồ liên kết **thực** tới User Story, Acceptance Criteria, Task và Sprint, bên cạnh phần AI nhận định. Chỉ cập nhật khi chọn *Xác nhận áp dụng*. Có kiểm tra phiên bản trước khi ghi và lưu lịch sử.
3. **AI · Truy vết bàn giao**: theo dõi Requirement → Story → AC → Task → Sprint; cho phép thành viên xác nhận thủ công tình trạng kiểm thử của từng AC; tính điều kiện bàn giao dựa trên dữ liệu, không dựa vào dự đoán AI.

Không tạo chức năng Test Case tự động trong patch này. Trạng thái `PASSED` là **đánh dấu của thành viên** chứ không phải bằng chứng đã chạy test tự động. "Đủ điều kiện" chỉ phản ánh bộ quy tắc nêu dưới đây, không phải phát hành đã được duyệt.

## Cài đặt lần đầu (Windows)

1. **Sao lưu source và database** hiện tại.
2. Với **ZIP cập nhật các file**: giải nén nội dung ZIP vào **thư mục gốc của dự án hiện có** (thư mục chứa `frontend`, `backend` và `ai-service`), chọn *Replace* khi trùng tên. Không xóa thư mục cũ.
3. Với **ZIP toàn bộ dự án**: giải nén vào một thư mục mới. Bản này chứa source code và cấu hình mẫu, **không chứa** `.env`, mật khẩu, token, `node_modules`, `.venv`, `backend/target` hoặc dữ liệu SQL cá nhân. Giữ lại `.env` và database của bản cũ khi nâng cấp, hoặc tạo các file cấu hình từ `backend/.env.example` và `ai-service/.env.example`.
4. Đảm bảo `AI_INTERNAL_KEY` trong hai `.env` giống nhau, bổ sung `AI_API_KEY` và `AI_BASE_URL` nếu muốn phân tích ngữ nghĩa bằng LLM.
5. Đặt `DB_DDL_AUTO=update` trong `backend/.env` và sao lưu dữ liệu trước khi khởi động; Hibernate sẽ **tạo thêm bảng mới**. Nếu DB không cho phép Hibernate cập nhật cấu trúc, cần chạy migration SQL thủ công theo chính sách của DB của bạn.
6. Mở ba PowerShell trong thư mục gốc dự án và lần lượt chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-AI.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Backend.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Frontend.ps1
```

Mở `http://localhost:5173`, đăng nhập, chọn Project, sau đó mở ba trang AI mới trên sidebar.

## Cách hoạt động khi không có AI API key

- Quét xung đột: chỉ phát hiện **các nội dung yêu cầu giống nhau** sau chuẩn hóa, không khẳng định mâu thuẫn nghiệp vụ.
- Mô phỏng: vẫn thấy liên kết từ database; không có suy luận AI ngữ nghĩa.
- Truy vết bàn giao: vẫn hoạt động đầy đủ vì dùng quan hệ trong database và trạng thái xác nhận QA thủ công.

Màn hình hiển thị cảnh báo rõ khi LLM chưa được cấu hình. Nếu nhà cung cấp LLM trả lỗi HTTP hoặc JSON không hợp lệ, API trả lỗi để người dùng kiểm tra; không tự tạo phân tích giả.

## Cấu trúc dữ liệu thêm vào SQL Server

Hibernate/JPA tạo: `requirement_conflicts`, `requirement_versions`, `requirement_impact_reports`, `criterion_verifications`.

- `requirement_conflicts`: `projectId`, hai Requirement ID, loại, mức độ, bằng chứng, giải thích, đề xuất, `OPEN/RESOLVED/DISMISSED/STALE`.
- `requirement_versions`: snapshot trước/sau, người sửa, nguồn `MANUAL` hoặc `AI_IMPACT`.
- `requirement_impact_reports`: báo cáo xem trước, checksum nội dung gốc, nội dung đề xuất, trạng thái `PREVIEW/APPLIED`.
- `criterion_verifications`: 1 bản ghi cho mỗi criterion trong project; trạng thái `NOT_RUN/PASSED/FAILED/BLOCKED`, ghi chú, người xác nhận.

> Nếu Requirement thay đổi, mọi kết quả kiểm thử thủ công của AC liên quan sẽ được đưa về `NOT_RUN` và các cảnh báo xung đột liên quan đánh dấu `STALE`, để tránh sử dụng kết quả cũ.

## API mới (tất cả yêu cầu JWT và quyền truy cập đúng Project)

| Method | Endpoint dưới `/api/projects/{projectId}` | Công dụng |
|---|---|---|
| POST | `/requirements/scan-conflicts` | Chạy phân tích giữa các Requirement |
| GET | `/requirements/conflicts` | Danh sách cảnh báo đã lưu |
| PUT | `/requirements/conflicts/{id}` | Đổi trạng thái cảnh báo; body `{"status":"RESOLVED"}` |
| POST | `/requirements/{id}/simulate-change` | Xem trước; body `{"newTitle":"...","newDescription":"..."}` |
| POST | `/requirements/{id}/apply-change/{reportId}` | Áp dụng báo cáo đã lưu; từ chối nếu Requirement gốc đã thay đổi |
| GET | `/requirements/{id}/versions` | Lịch sử phiên bản |
| GET | `/requirements/{id}/impact-reports` | Các lượt mô phỏng |
| GET | `/traceability` | Báo cáo yêu cầu → bàn giao |
| PUT | `/criteria/{id}/verification` | Ghi kết quả xác nhận QA; body `{"status":"PASSED","notes":"Đã kiểm tra thủ công"}` |

FastAPI (chỉ Backend gọi, cần `X-Internal-Key`):

- `POST /ai/requirements/conflicts`
- `POST /ai/requirements/impact`

## Quy tắc “đủ điều kiện bàn giao”

Một Requirement chỉ được hiển thị **Đủ điều kiện theo quy tắc** nếu:

- Requirement có trạng thái `COMPLETED`.
- Có ít nhất một User Story.
- **Mỗi** User Story có ít nhất một Acceptance Criteria và ít nhất một Task liên kết.
- **Tất cả** AC đều đã được thành viên xác nhận `PASSED`.
- **Tất cả** Task có liên kết đều có trạng thái `DONE`.

Task ở backlog không có `storyId` sẽ không được tự động gắn vào Requirement — đó là khoảng trống trong quy trình lập kế hoạch, không phải liên kết do AI tự suy đoán. Trạng thái Release còn phụ thuộc kiểm thử thực tế, phê duyệt và triển khai của tổ chức.

## Checklist demo

1. Tạo hai Requirement: (A) “Có thể hủy đơn bất kỳ lúc nào”; (B) “Không được hủy đơn sau khi giao hàng”. Với API key LLM hợp lệ, bấm **Quét yêu cầu**, xem cảnh báo, đánh dấu **Đã giải quyết** sau khi xác minh.
2. Trong **AI · Mô phỏng thay đổi**, chọn Requirement có Story/Task; nhập nội dung mới; kiểm tra cột *Liên kết dữ liệu thật*, đọc đề xuất từ AI và bấm **Xác nhận áp dụng**. Thử xem lịch sử phiên bản.
3. Trong **AI · Truy vết bàn giao**, mở Requirement và cập nhật từng AC từ `NOT_RUN` thành `PASSED` sau khi kiểm thử thực sự; liên kết Task với Story, đặt Task `DONE` và Requirement `COMPLETED` để xem trạng thái bàn giao.
4. Sửa lại Requirement đó → các xác nhận QA liên quan sẽ quay về `NOT_RUN` (cần kiểm thử lại).
5. Thử gọi API của một Project khác bằng tài khoản không có quyền → bị chặn bởi `ProjectAccess`.

## Kiểm tra tự động

```powershell
cd ai-service
python -m pip install -r requirements.txt
python -m pytest tests/test_engineering_intelligence.py -q
cd ..\frontend
npm install
npm run build
cd ..\backend
mvn test
```

Đã kiểm tra cú pháp và unit test FastAPI tại môi trường tạo patch; kiểm tra tích hợp thật với SQL Server, FastRouter và frontend cần chạy trên máy có cấu hình service/credentials phù hợp.
