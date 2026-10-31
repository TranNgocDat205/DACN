# DevPilot AI — Studio UI Redesign

Bản source này kế thừa DevPilot Tavily + Fix HTTP301 và bổ sung giao diện **Editorial Engineering Studio**.

- Backend, AI Service và database: giữ nguyên từ bản trước.
- Chỉnh sửa frontend: xem `docs/STUDIO_DESIGN_GUIDE.md`.
- Xem trước tĩnh: `preview/Studio_Preview.html` (có dữ liệu minh họa).
- Không có `.env` hoặc API key riêng trong gói.

Chạy frontend trong thư mục `frontend`:

```powershell
npm install
npm run dev
```

Truy cập http://localhost:5173 sau khi Backend và AI Service đã chạy.
