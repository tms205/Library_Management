--liquibase formatted sql

--changeset manh:008-1
-- Gan cac account ADMIN cu vao ADMIN_GROUP
INSERT INTO account_permission_groups (
    account_id,
    permission_group_id
)
SELECT
    a.id,
    pg.id
FROM accounts a
JOIN permission_groups pg
    ON pg.name = 'ADMIN_GROUP'
WHERE a.role = 'ADMIN'
AND NOT EXISTS (
    SELECT 1
    FROM account_permission_groups apg
    WHERE apg.account_id = a.id
      AND apg.permission_group_id = pg.id
);


--changeset manh:008-2
-- Gan cac account USER cu vao USER_GROUP
INSERT INTO account_permission_groups (
    account_id,
    permission_group_id
)
SELECT
    a.id,
    pg.id
FROM accounts a
JOIN permission_groups pg
    ON pg.name = 'USER_GROUP'
WHERE a.role = 'USER'
AND NOT EXISTS (
    SELECT 1
    FROM account_permission_groups apg
    WHERE apg.account_id = a.id
      AND apg.permission_group_id = pg.id
);