# Library_Management
#first commit:
## 📌 Tiến độ hiện tại
### ✅ Công nghệ sử dụng
- Java 17
- Spring Boot 4.1.1
- Spring Data JPA / Hibernate
- Spring Security
- JWT
- MySQL
- Liquibase
- Lombok
- Java Mail Sender
- Maven
### ✅ Các chức năng đã hoàn thành
#### Authentication & Authorization
- Đăng ký tài khoản Member.
- Validate email, password và thông tin người dùng.
- Mã hóa mật khẩu bằng BCrypt.
- Xác minh email sau đăng ký bằng token gửi qua Gmail.
- Chỉ tài khoản đã xác minh email mới được đăng nhập.
- Đăng nhập bằng Spring Security + JWT.
- JWT chứa thông tin email và role.
- JWT Authentication Filter để xác thực request.
- Phân quyền API theo 2 role:
  - `ADMIN`
  - `USER`
- Logout và blacklist JWT.
- Token đã logout không thể tiếp tục gọi API.

#### Account Management
- Forgot Password:
  - Sinh reset token.
  - Gửi token qua Gmail.
  - Token có thời hạn.
- Reset Password:
  - Kiểm tra token.
  - BCrypt mật khẩu mới.
  - Token chỉ được sử dụng một lần.
- Change Password:
  - Xác định user hiện tại từ JWT.
  - Kiểm tra mật khẩu cũ.
  - Cập nhật mật khẩu mới.
- Change Email:
  - Gửi mã xác minh 6 số tới email mới.
  - Kiểm tra mã và thời hạn.
  - Chỉ đổi email khi xác minh thành công.
  - JWT cũ bị blacklist sau khi đổi email.
#### Database
- Mapping JPA/Hibernate:
  - One-to-One
  - One-to-Many
  - Many-to-Many
- Quản lý database migration bằng Liquibase.
- Hibernate sử dụng `ddl-auto=validate`.
- Các migration hiện có:
  - Khởi tạo database schema.
  - Seed tài khoản Admin.
  - Email Verification Token.
  - Password Reset Token.
  - Email Change Request.
#### Exception Handling
- Global Exception Handler.
- Custom Exception cho:
  - Login sai thông tin.
  - Account chưa verify.
  - Verification Token.
  - Password Reset.
  - Change Password.
  - Change Email.
- Validation error trả về response rõ ràng cho client.
### 🔄 Phần tiếp theo
- Book Management
  - Search Book
  - Paging
  - Sorting
  - Spring Data Specification
  - CRUD Book
  - Import Book từ CSV
