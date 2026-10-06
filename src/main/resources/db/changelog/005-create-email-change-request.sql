--liquibase formatted sql

--changeset manh:005-create-email-change-request

CREATE TABLE email_change_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    new_email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    account_id BIGINT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_email_change_account
        UNIQUE (account_id),

    CONSTRAINT fk_email_change_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
);