# Tài liệu SRS - E-commerce Demo

## 1. Mục tiêu
Xây dựng nền tảng thương mại điện tử hỗ trợ người mua tìm kiếm sản phẩm, quản lý giỏ hàng, đặt hàng và tra cứu trạng thái đơn hàng.

## 2. Quyền người dùng
- CUSTOMER: đăng ký, đăng nhập, xem sản phẩm, đặt đơn.
- ADMIN: quản lý danh mục, sản phẩm và trạng thái đơn hàng.

## 3. REQ-001 - Đăng nhập
Khách hàng có thể đăng nhập bằng email và mật khẩu. Email phải đúng định dạng; trường mật khẩu không được để trống. Sau khi đăng nhập thành công, hệ thống chuyển người dùng đến trang cá nhân. Nếu sai thông tin, hiển thị thông báo không tiết lộ email nào tồn tại. Không lưu mật khẩu dạng văn bản thuần.

## 4. REQ-002 - Giỏ hàng
Khách hàng có thể thêm sản phẩm còn hàng vào giỏ; số lượng sản phẩm phải là số nguyên dương. Người dùng được thay đổi số lượng, xóa sản phẩm. Tổng tiền được tính lại sau mỗi thao tác.

## 5. REQ-003 - Đặt hàng
Chỉ khách đã đăng nhập mới được xác nhận đặt hàng. Khi xác nhận, hệ thống kiểm tra tồn kho. Nếu thiếu hàng, thông báo sản phẩm không đủ tồn kho và không tạo đơn.

## 6. API tham khảo
- POST /api/auth/login : xác thực email và password.
- GET /api/products : lấy danh sách sản phẩm.
- POST /api/cart/items : thêm sản phẩm vào giỏ.
- POST /api/orders : tạo đơn hàng.

## 7. Phi chức năng
Thời gian phản hồi API tra cứu sản phẩm nên dưới 2 giây ở mức tải dự kiến (cần thỏa thuận tải). Dữ liệu cá nhân phải được bảo vệ. Nhật ký nghiệp vụ lưu thời gian và người thực hiện hành động quan trọng.
