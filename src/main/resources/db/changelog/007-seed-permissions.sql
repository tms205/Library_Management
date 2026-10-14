--liquibase formatted sql

--changeset manh:007-1
INSERT INTO permissions (name, description)
VALUES
('BOOK_VIEW', 'Xem sách'),
('BOOK_CREATE', 'Thêm sách'),
('BOOK_UPDATE', 'Sửa sách'),
('BOOK_DELETE', 'Xóa sách'),
('BOOK_IMPORT', 'Import sách bằng CSV'),
('MEMBER_VIEW', 'Xem thành viên'),
('MEMBER_CREATE', 'Tạo thành viên'),
('MEMBER_UPDATE', 'Sửa thành viên'),
('BORROW_BOOK', 'Mượn sách'),
('RETURN_BOOK', 'Trả sách'),
('SYSTEM_MAINTENANCE', 'Bật tắt maintenance mode');

--changeset manh:007-2
INSERT INTO permission_groups (name, description)
VALUES
('ADMIN_GROUP', 'Nhóm quản trị'),
('STAFF_GROUP', 'Nhóm nhân viên thư viện'),
('USER_GROUP', 'Nhóm thành viên thư viện');

--changeset manh:007-3
INSERT INTO group_permissions (
    permission_group_id,
    permission_id
)
SELECT pg.id, p.id
FROM permission_groups pg
CROSS JOIN permissions p
WHERE pg.name = 'ADMIN_GROUP';

--changeset manh:007-4
INSERT INTO group_permissions (
    permission_group_id,
    permission_id
)
SELECT pg.id, p.id
FROM permission_groups pg
JOIN permissions p
    ON p.name IN (
        'BOOK_VIEW',
        'BOOK_CREATE',
        'BOOK_UPDATE',
        'BOOK_IMPORT',
        'MEMBER_VIEW',
        'MEMBER_CREATE',
        'MEMBER_UPDATE',
        'BORROW_BOOK',
        'RETURN_BOOK'
    )
WHERE pg.name = 'STAFF_GROUP';

--changeset manh:007-5
INSERT INTO group_permissions (
    permission_group_id,
    permission_id
)
SELECT pg.id, p.id
FROM permission_groups pg
JOIN permissions p
    ON p.name IN (
        'BOOK_VIEW',
        'BORROW_BOOK',
        'RETURN_BOOK'
    )
WHERE pg.name = 'USER_GROUP';