--liquibase formatted sql

--changeset manh:014-1
-- Thêm cột hạn trả sách (due_date) vào bảng phiếu mượn
ALTER TABLE borrow_records
    ADD COLUMN due_date DATE NULL;

--changeset manh:014-2
-- Tự động tính bù hạn trả 14 ngày (2 tuần) cho các bản ghi đã mượn nhưng chưa có hạn trả
UPDATE borrow_records
SET due_date = DATE_ADD(borrow_date, INTERVAL 14 DAY)
WHERE borrow_date IS NOT NULL AND due_date IS NULL;
