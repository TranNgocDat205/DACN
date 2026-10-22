# Đưa DevPilot AI lên GitHub (Windows, PowerShell)

> Đây là bản **source đã được lọc để chuẩn bị đăng lên GitHub**. Không chứa `.env` thật, `.venv`, `target`, `node_modules` hoặc dữ liệu RAG nội bộ từ ZIP đã cung cấp. Vẫn cần kiểm tra trước khi chuyển repo sang Public.

## 1. Chuẩn bị
- Đăng nhập GitHub và cài Git for Windows: https://git-scm.com/downloads/win
- Trên GitHub, tạo **New repository** tên `DevPilot-AI-Software-Development-Assistant`, chọn **Private** ban đầu.
- Không tích vào **Add README**, **Add .gitignore** hoặc **Choose a license**, vì dự án đã có file tương ứng (trừ license).
- Giải nén ZIP này vào một **thư mục mới**, không giải nén đè lên dự án chứa `.env` thật.

## 2. Commit và push bằng PowerShell
Mở Terminal trong **thư mục `AI_Software_Development_Assistant` đã giải nén**, rồi chạy lần lượt:

```powershell
git --version
git init -b main
git status --short
git add .
git status --short
# Kiểm tra không có dòng .env thật hoặc API key trong các tệp chuẩn bị commit.
git diff --cached --name-only
# Nếu thấy các tệp riêng tư, dừng lại và loại bỏ trước khi commit.
git commit -m "Initial commit: DevPilot AI"
git remote add origin https://github.com/USERNAME/DevPilot-AI-Software-Development-Assistant.git
git push -u origin main
```

Thay `USERNAME` bằng tên tài khoản GitHub của bạn. Git có thể mở cửa sổ để bạn đăng nhập GitHub. **Không dán API key hoặc mật khẩu SQL Server** vào cửa sổ xác thực GitHub.

Nếu `git` báo thiếu tên/email trước khi commit, cấu hình:

```powershell
git config --global user.name "TEN_HIEN_THI_CUA_BAN"
git config --global user.email "EMAIL_GITHUB_CUA_BAN"
```

Nếu repo trên máy bạn đã có Git và remote `origin`, hãy kiểm tra `git remote -v` trước khi thêm remote; không chạy `git init` hay thêm `origin` lần nữa.

## 3. Lệnh kiểm tra tệp bí mật trước khi push

```powershell
git check-ignore -v ai-service/.env backend/.env
git ls-files | Select-String -Pattern '(^|/)\.env$|\.venv|node_modules|target/|ai-service/data/'
```

Lệnh đầu cho biết `.env` được bỏ qua; lệnh sau **không nên hiển thị tệp** nếu các đường dẫn đó đã được loại trừ đúng.

## 4. Chạy dự án sau khi clone
Copy `backend/.env.example` sang `backend/.env` và `ai-service/.env.example` sang `ai-service/.env`, sau đó điền giá trị **mới** trên máy chạy. Không đẩy `.env` lên GitHub.

## An toàn thông tin
Các API key (Tavily, FastRouter, RevidAPI) và mật khẩu SQL đã từng được chia sẻ qua trò chuyện. Hãy **thu hồi, tạo lại khóa và đổi mật khẩu SQL**, kể cả khi bản ZIP sạch không chứa các khóa đó.
