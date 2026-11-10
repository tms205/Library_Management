--liquibase formatted sql

--changeset system:017-1
-- Thêm cột is_default vào permission_groups để bảo vệ các nhóm mặc định cốt lõi của hệ thống
ALTER TABLE permission_groups ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Đánh dấu các nhóm quyền mặc định của hệ thống
UPDATE permission_groups SET is_default = TRUE WHERE name IN ('ADMIN_GROUP', 'STAFF_GROUP', 'USER_GROUP');

--changeset system:017-2
-- Thêm cột cấu hình thời hạn mượn sách vào bảng system_configs (mặc định 7 ngày theo yêu cầu)
ALTER TABLE system_configs ADD COLUMN borrow_duration_days INT NOT NULL DEFAULT 7;

-- Cập nhật bản ghi cấu hình hiện có
UPDATE system_configs SET borrow_duration_days = 7 WHERE borrow_duration_days IS NULL;

--changeset system:017-3
-- Tạo index tối ưu hóa cho truy vấn tồn kho và khóa đồng thời
CREATE INDEX idx_books_quantity ON books(quantity);
CREATE INDEX idx_borrow_records_status_book ON borrow_records(status, book_id);
