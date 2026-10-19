--liquibase formatted sql

--changeset manh:011-password-reset-otp

DELETE FROM password_reset_tokens;

ALTER TABLE password_reset_tokens
    CHANGE COLUMN token otp VARCHAR(6) NOT NULL;

ALTER TABLE password_reset_tokens
    ADD COLUMN used BOOLEAN NOT NULL DEFAULT FALSE;