# 📱 Ứng dụng Di Động Library Management (React Native & Expo)

Ứng dụng di động toàn diện của Hệ thống Quản lý Thư viện, hỗ trợ đầy đủ các tính năng tương đương 100% với phiên bản Web.

---

## 🚀 Tính năng đầy đủ (100% như Web)

### 1. Phân hệ Xác thực & Tài khoản (Auth & Account)
* **Đăng nhập (Login)**: Xác thực Spring Security + JWT, lưu trữ an toàn bằng `AsyncStorage`.
* **Đăng ký thành viên mới (Register)**: Đăng ký họ tên, ngày sinh, số điện thoại, địa chỉ, email và mật khẩu (hệ thống tự động gửi mail xác minh).
* **Quên mật khẩu (Forgot/Reset Password)**: Nhận mã OTP 6 số qua email $\rightarrow$ Đặt lại mật khẩu mới ngay trên app.
* **Đổi mật khẩu (Change Password)**: Đổi mật khẩu tài khoản trực tiếp trong ứng dụng.
* **Đổi địa chỉ Email (Change Email)**: Gửi mã xác nhận 6 số tới email mới $\rightarrow$ Xác nhận mã để đổi email $\rightarrow$ Blacklist token cũ.
* **Cơ chế Refresh Token tự động**: Tự động lấy accessToken mới khi token cũ hết hạn, không làm gián đoạn trải nghiệm người dùng.
* **Đăng xuất (Logout)**: Đưa token vào Blacklist trên máy chủ và xóa sạch phiên làm việc trên thiết bị.

### 2. Dành cho Độc giả (User / Member)
* **Khám phá & Tra cứu Sách**: Tìm kiếm theo tên hoặc ISBN, phân trang, lọc sách.
* **Chi tiết & Mượn sách**: Xem thông tin chi tiết tác giả, ngày xuất bản, tồn kho và bấm gửi yêu cầu mượn sách.
* **Sách của tôi**: Theo dõi trạng thái mượn sách (`Chờ duyệt`, `Đang mượn`, `Chờ nhận trả`, `Đã trả`, `Bị từ chối`) với bộ lọc tiện lợi.
* **Yêu cầu trả sách**: Bấm gửi yêu cầu trả các cuốn sách đang mượn.

### 3. Dành cho Thủ thư & Quản trị viên (Staff / Admin)
* **Quản lý Sách (CRUD Sách)**:
  * Nút **+ Thêm sách** mở modal tạo sách mới (Tiêu đề, ISBN, số lượng, ngày xuất bản).
  * Nút **Sửa sách** cập nhật thông tin sách trực tiếp.
  * Nút **Xóa sách** với hộp thoại xác nhận.
* **Quản lý Mượn / Trả (Borrow Management)**:
  * Xem toàn bộ danh sách yêu cầu mượn/trả trong thư viện.
  * Nút **✅ Duyệt mượn** hoặc **❌ Từ chối** đối với yêu cầu đang chờ (`PENDING`).
  * Nút **📥 Xác nhận đã nhận lại sách** khi độc giả gửi trả (`RETURN_PENDING`) $\rightarrow$ Sách tự động được cộng lại vào kho.
* **Quản lý Độc giả (Member Management)**:
  * Tra cứu, tìm kiếm độc giả theo họ tên.
  * Xem thông tin chi tiết (Email, Số điện thoại, Địa chỉ, Ngày sinh).
  * **Sửa thông tin độc giả** trực tiếp trên app.
  * **Xóa tài khoản độc giả**.
* **Cấu hình Hệ thống (Maintenance Mode)**:
  * Công tắc (Switch) **Bật / Tắt chế độ bảo trì hệ thống**: Khi bật bảo trì, chặn toàn bộ người dùng gọi API, chỉ Admin mới có quyền truy cập.

---

## 📲 Hướng dẫn chạy thử nghiệm trên điện thoại thật
1. Cài app **Expo Go** trên điện thoại (từ Google Play Store hoặc App Store).
2. Đảm bảo điện thoại và máy tính kết nối **chung một mạng Wi-Fi**.
3. Chạy server:
   ```powershell
   cd mobile
   npx expo start -c
   ```
4. Quét mã QR hiển thị trên màn hình terminal bằng app **Expo Go** (Android) hoặc **Camera** (iPhone).
