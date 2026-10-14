--liquibase formatted sql

--changeset manh:006-1
CREATE TABLE permissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

--changeset manh:006-2
CREATE TABLE permission_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

--changeset manh:006-3
CREATE TABLE group_permissions (
    permission_group_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (
        permission_group_id,
        permission_id
    ),

    CONSTRAINT fk_group_permissions_group
        FOREIGN KEY (permission_group_id)
        REFERENCES permission_groups(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_group_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

--changeset manh:006-4
CREATE TABLE account_permission_groups (
    account_id BIGINT NOT NULL,
    permission_group_id BIGINT NOT NULL,

    PRIMARY KEY (
        account_id,
        permission_group_id
    ),

    CONSTRAINT fk_account_permission_group_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_account_permission_group_group
        FOREIGN KEY (permission_group_id)
        REFERENCES permission_groups(id)
        ON DELETE CASCADE
);