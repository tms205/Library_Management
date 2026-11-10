--liquibase formatted sql

--changeset manh:016-1
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_account_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id BIGINT NULL,
    reference_type VARCHAR(50) NULL,
    reference_code VARCHAR(100) NULL,
    is_read BIT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_notifications_recipient_batch
        UNIQUE (recipient_account_id, reference_type, reference_code)
);

CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_account_id, is_read, created_at DESC);

--changeset manh:016-2
CREATE TABLE device_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    device_id VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_device_tokens_token UNIQUE (token),
    CONSTRAINT fk_device_tokens_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_device_tokens_account ON device_tokens(account_id);
