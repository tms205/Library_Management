--liquibase formatted sql

--changeset manh:004-create-password-reset-token

CREATE TABLE password_reset_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    account_id BIGINT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_password_reset_token
        UNIQUE (token),

    CONSTRAINT uk_password_reset_account
        UNIQUE (account_id),

    CONSTRAINT fk_password_reset_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
);