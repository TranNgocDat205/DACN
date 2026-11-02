# DevPilot AI — Premium Nebula UI V6

## Phạm vi

Bản cập nhật chỉ chỉnh **Frontend**. Giữ nguyên Backend Spring Boot, AI Service FastAPI, SQL Server, các API request/response, JWT, RBAC và OTP. Không có thay đổi DB/schema và không bổ sung thư viện npm.

## Thiết kế

- Chủ đề: Futuristic AI SaaS / Nebula Command Deck — midnight navy, indigo, lavender, cyan; hỗ trợ dark/light.
- Dashboard: CSS 3D holographic reactor thay cho biểu đồ tròn đơn giản, vẫn thể hiện đúng `%` tiến độ thực từ Project.
- Chỉ số: số đếm hiện dần, đọc dữ liệu thật; 3D tilt nhẹ trên card, chỉ bật khi thiết bị có hover/pointer fine.
- AI Chat/RAG: AI orb, hiệu ứng typing khi request đang chạy; không tự tạo câu trả lời hoặc thay đổi trạng thái API.
- Login/Register/OTP: đồng bộ màu, glass card, quỹ đạo 3D CSS, bổ sung dark mode thực sự; không sửa validation hay flow xác minh.
- Landing Page: nâng cấp bộ màu và chiều sâu; CTA vẫn chuyển sang luồng đăng nhập/đăng ký sẵn có.
- Admin/Kanban/Requirement/AI Intelligence: border/surface/spacing/shadow đồng bộ với thiết kế mới.
- Responsive: 1150px, 980px, 700px, 390px; Kanban có khả năng cuộn ngang theo cột trên điện thoại.
- Khả năng tiếp cận: `prefers-reduced-motion`, thao tác phím, focus outline; hiệu ứng 3D không che nội dung/cản trở click.

## File mới và đã sửa

1. `frontend/src/premium-experience.css` — design layer và responsive.
2. `frontend/src/components/PremiumMotion.jsx` — MotionSurfaceController, AnimatedMetric, HoloReactor, AiActivityOrb.
3. `frontend/src/main.jsx` — import layer mới, page animation, AI chat orb và loading indicator.
4. `frontend/src/components/MissionControl.jsx` — holographic reactor, counters và tilt.
5. `frontend/src/components/AuthExperience.jsx` — bổ sung class style cho quỹ đạo đăng nhập.
6. `frontend/src/components/LandingPage.jsx` — bổ sung class style cho sản phẩm giới thiệu.
7. `frontend/index.html` — theme-color, color-scheme.
8. `docs/PREMIUM_UI_V6.md` — tài liệu này.

## Nâng cấp dự án đang chạy

**Sao lưu dự án và các file `.env` trước khi giải nén.**

Nếu dùng `DevPilot-AI-UI-Changed-Files.zip`: giải nén tại thư mục *cha* của `AI_Software_Development_Assistant`, giữ đúng cấu trúc thư mục.

```powershell
cd C:\Users\datro\Documents\AI_Software_Development_Assistant\frontend
npm ci
npm run build
npm run dev
```

Với bản full: `.env` thật, `.venv`, `node_modules`, build output và thư mục RAG private đã được loại bỏ. Bạn cần giữ lại `.env` trên máy đang chạy, hoặc thiết lập từ `.env.example`.

## Kiểm thử đề xuất

1. Chạy `npm run build` và xác nhận không có lỗi import `PremiumMotion.jsx` hoặc CSS.
2. Đăng ký → OTP → đăng nhập bằng Admin và USER để xác nhận luồng JWT hoạt động như trước.
3. Mở Dashboard, chuyển Project và thử bấm KPI, bản đồ luồng, AI cards, quick search `Ctrl+K`.
4. Mở Kanban và thử kéo thả task, đổi trạng thái, mở modal, kiểm thử quyền VIEWER bằng API.
5. Mở RAG, gửi câu hỏi; khi đang đợi, orb và typing indicator hiển thị; lỗi thật từ API vẫn giữ nguyên.
6. Chuyển dark/light ở Landing, Login và Dashboard.
7. Thử màn hình 390px, 768px, 1024px, 1440px; bật Reduce Motion trên OS để xác nhận không có hiệu ứng liên tục.

## Kết quả kiểm tra tại môi trường biên soạn

- Phân tích cú pháp JS/JSX bằng Babel parser: đạt.
- Phân tích cú pháp CSS bằng PostCSS: đạt.
- Kiểm tra đường dẫn import nội bộ: đạt.
- So sánh source: không chỉnh Backend/AI Service, JWT, RBAC, API.
- **Chưa xác nhận được `vite build` tại môi trường này**: archive gốc chứa `node_modules` của Windows; thư viện native Rollup/esbuild cho Linux không có sẵn và npm registry không tải được đầy đủ.
- **Chưa kiểm thử tích hợp Backend/AI Service hoặc trình duyệt đa thiết bị thực tế**; cần làm tại máy Windows theo hướng dẫn trên.

## Bảo mật

Không đưa `.env` và khóa API vào ZIP hoặc GitHub. Các file `.env.example` chỉ nên chứa placeholder. Nếu khóa đã từng được chia sẻ, nên xoay vòng khóa trước khi triển khai công khai.
