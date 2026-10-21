# 📚 Library Management System

Hệ thống quản lý thư viện được xây dựng bằng **Spring Boot + React**, hỗ trợ quản lý sách, thành viên, mượn/trả sách, xác thực JWT, phân quyền theo Permission, xác minh email, refresh token, maintenance mode, import CSV, logging, Swagger và JUnit Test.

---

# 📌 Tiến độ hiện tại

## ✅ Backend gần hoàn thiện

Các chức năng chính của bài tập Library Management đã được triển khai:

- Authentication / Authorization
- Permission-based Access Control
- Account Management
- Book Management
- Member Management
- Borrow / Return Workflow
- Maintenance Mode
- CSV Import
- JWT + Refresh Token
- Email Verification
- Password Reset
- Change Password / Change Email
- Global Exception Handling
- Liquibase
- Log4j2
- AOP Request / Response Logging
- Swagger / OpenAPI
- JUnit Test
- React Frontend

---

# 🛠 Công nghệ sử dụng

## Backend

- Java 17
- Spring Boot 4.1.1
- Spring Web MVC
- Spring Data JPA
- Hibernate
- Spring Security
- JWT
- Refresh Token
- Spring Validation
- Spring Mail
- Spring AOP / AspectJ
- Log4j2
- MySQL
- Liquibase
- Lombok
- Apache Commons CSV
- Apache Commons IO
- Springdoc OpenAPI / Swagger
- JUnit
- Mockito
- Maven

## Frontend

- React
- Vite
- React Router
- JWT Authentication
- Permission-based UI
- Responsive Dashboard Layout

---

# 🔐 Authentication & Authorization

## ✅ Đăng ký tài khoản

Hệ thống hỗ trợ đăng ký tài khoản Member.

Có validation:

- Email
- Password
- Họ tên
- Ngày sinh
- Số điện thoại
- Địa chỉ

Mật khẩu được mã hóa bằng:

```text
BCrypt
