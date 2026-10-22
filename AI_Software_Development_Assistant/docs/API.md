# REST API REFERENCE

Backend base `http://localhost:8080/api`. Dùng `Authorization: Bearer <JWT>` trừ các route đăng nhập/đăng ký/health.

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | /auth/register | `{name,email,password}` -> `{token,user}` |
| POST | /auth/login | `{email,password}` -> `{token,user}` |
| GET | /me | Tài khoản hiện tại |
| GET | /ai/status | Trạng thái kết nối AI (demo mode/LLM) |
| GET | /health | Kiểm tra backend |
| GET | /projects | Các project mà user là thành viên |
| POST | /projects | `{name,description}` |
| GET | /projects/{p} | Chi tiết project |
| PUT | /projects/{p} | Sửa project (owner) |
| GET | /projects/{p}/members | Thành viên |
| POST | /projects/{p}/members | `{email}` (owner) |
| GET/POST | /projects/{p}/requirements | Danh sách/tạo requirement |
| PUT/DELETE | /projects/{p}/requirements/{id} | Sửa/xóa requirement |
| POST | /projects/{p}/requirements/{id}/analyze | Phân tích AI và lưu kết quả |
| POST | /projects/{p}/requirements/{id}/generate-stories | Sinh story từ requirement |
| GET/POST | /projects/{p}/stories | Danh sách / tạo story |
| DELETE | /projects/{p}/stories/{id} | Xóa story khi không có task liên kết |
| GET | /projects/{p}/criteria | Danh sách acceptance criteria |
| POST | /projects/{p}/stories/{id}/generate-criteria | Sinh acceptance criteria |
| GET/POST | /projects/{p}/sprints | Sprint CRUD (list/create) |
| PUT/DELETE | /projects/{p}/sprints/{id} | Sửa/xóa sprint |
| GET/POST | /projects/{p}/tasks | Task CRUD (list/create) |
| PUT/DELETE | /projects/{p}/tasks/{id} | Sửa/xóa task |
| GET | /projects/{p}/documents | Danh sách documents |
| POST | /projects/{p}/documents | Multipart form-data `file` |
| DELETE | /projects/{p}/documents/{id} | Xóa tài liệu khỏi chỉ mục RAG |
| POST | /projects/{p}/chat | `{question}` -> `{answer,sources,mode}` |

## Sample JSON
Create requirement: `POST /projects/1/requirements`
```json
{"title":"Đăng nhập","description":"Người dùng đăng nhập bằng email/mật khẩu","priority":"HIGH","type":"FUNCTIONAL","status":"DRAFT"}
```
Create sprint: `POST /projects/1/sprints`
```json
{"name":"Sprint 1","goal":"Authentication","status":"PLANNED","startDate":"2026-10-10","endDate":"2026-10-24"}
```
Create task: `POST /projects/1/tasks`
```json
{"title":"Implement login API","description":"JWT + BCrypt","status":"TODO","priority":"HIGH","sprintId":1,"storyId":1,"assigneeId":1}
```
Update task status: `PUT /projects/1/tasks/1`
```json
{"title":"Implement login API","status":"IN_PROGRESS"}
```

## Bảo mật
All project-scoped endpoints verify membership. Links to sprint, story and assignee are checked for project ownership. AI service endpoints are internal (`X-Internal-Key`) and should not be internet-exposed.

## Responses
Valid JSON for successful non-delete calls; delete returns 200 with no body. Typical errors:
`400 Bad Request`, `401 Unauthorized` (invalid credentials), `403 Forbidden` (project permission), `404 Not Found`, `409 Conflict` (duplicate/member references), `502 Bad Gateway` (AI down/provider failure).

## Official Sources RAG (10/2026)

- `POST /projects/{p}/official-sources/search` — `{"query":"authentication","limit":10}`: tìm trong danh mục các URL chính thống được duyệt; `verified=false` nghĩa là mới là ứng viên.
- `POST /projects/{p}/official-sources/import` — `{"sourceId":"owasp-auth"}`: chỉ lấy source ID trong danh mục, xác minh và lập chỉ mục trang web HTML; trả `Document` với `sourceType`, `sourceUrl`, `publisher`, `fetchedAt`.
- `POST /projects/{p}/chat` — `{"question":"JWT nên được bảo vệ thế nào?","includeOfficialSources":true}`: cho phép đọc tối đa 2 trang chính thống trực tuyến, không tự lưu vào DB. `sources[]` chứa `url`, `publisher`, `fetchedAt` khi có nguồn web; `warnings[]` ghi các sự cố tải nguồn.

Xem [RAG_OFFICIAL_SOURCES.md](RAG_OFFICIAL_SOURCES.md) để biết whitelist, giới hạn và cách demo.
