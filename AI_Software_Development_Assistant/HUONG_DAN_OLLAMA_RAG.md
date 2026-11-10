# AI cục bộ Ollama + RAG cho DevPilot AI

## Cài trên Windows

1. Cài Ollama từ https://ollama.com/download/windows và mở ứng dụng.
2. Trong PowerShell: `ollama pull qwen2.5-coder:3b` và `ollama pull nomic-embed-text`.
3. Trong `ai-service/.env` (không commit), đặt:

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5-coder:3b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

Giữ nguyên `AI_INTERNAL_KEY` đã cấu hình trùng với `backend/.env`.

4. Từ thư mục dự án, chạy `./scripts/Start-AI.ps1`, rồi `./scripts/Start-Backend.ps1`, `./scripts/Start-Frontend.ps1` ở ba terminal riêng.
5. Kiểm tra `http://127.0.0.1:8000/health`: `provider` phải là `Ollama (local)` và `local_mode` là `true`. Đây chỉ là kiểm tra cấu hình, không chứng minh mô hình đã chạy; thử chat/RAG để xác nhận.

## RAG

- Giữ nguyên các endpoint upload tài liệu, tra cứu và chat đã có; không cần sửa Spring Boot hoặc React.
- PDF có lớp văn bản, DOCX, TXT và MD được hỗ trợ. PDF scan chưa có OCR.
- Các tài liệu mới được nhúng bằng `nomic-embed-text` và lưu theo project trong `ai-service/data/` (được gitignore).
- Tài liệu cũ với vector từ provider khác vẫn tra cứu được bằng lexical fallback. Để đồng nhất kết quả semantic, nên tải lại tài liệu cũ sau khi đổi provider.
- Nếu chọn tìm nguồn chính thống trên web, tính năng đó vẫn có thể truy cập Internet; không bật nếu cần hoàn toàn offline.
- Khi Ollama không chạy hoặc chưa tải mô hình, AI Service trả lỗi thay vì giả vờ có câu trả lời AI.

## Kiểm thử

`cd ai-service` rồi chạy `python -m pytest tests/test_ollama_provider.py -q` trong môi trường đã cài `requirements.txt`.

## GitHub

Không commit `.env`, API key, dữ liệu RAG hoặc file database. Push nhánh riêng rồi tạo Pull Request. GitHub lưu mã nguồn, không tự chạy mô hình Ollama.
