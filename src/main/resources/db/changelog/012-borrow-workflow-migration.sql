--liquibase formatted sql

--changeset manh:012-1
ALTER TABLE borrow_records
    MODIFY COLUMN borrow_date DATE NULL;

ALTER TABLE borrow_records
    MODIFY COLUMN status VARCHAR(50) NOT NULL;

--changeset manh:012-2
INSERT INTO permissions (name, description)
SELECT 'BORROW_APPROVE', 'Duyệt hoặc từ chối yêu cầu mượn sách'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'BORROW_APPROVE'
);

INSERT INTO permissions (name, description)
SELECT 'RETURN_CONFIRM', 'Xác nhận nhận lại sách khi người dùng trả'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'RETURN_CONFIRM'
);

--changeset manh:012-3
INSERT INTO group_permissions (
    permission_group_id,
    permission_id
)
SELECT pg.id, p.id
FROM permission_groups pg
JOIN permissions p
    ON p.name IN ('BORROW_APPROVE', 'RETURN_CONFIRM')
WHERE pg.name IN ('ADMIN_GROUP', 'STAFF_GROUP')
AND NOT EXISTS (
    SELECT 1
    FROM group_permissions gp
    WHERE gp.permission_group_id = pg.id
      AND gp.permission_id = p.id
);
