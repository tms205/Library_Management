--liquibase formatted sql

--changeset hieu:010-create-refresh-token

CREATE TABLE refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date DATETIME NOT NULL,
    account_id BIGINT NOT NULL,

    CONSTRAINT fk_refresh_token_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
);