--liquibase formatted sql
--changeset manh:015-add-otp-code-to-email-verification-tokens
ALTER TABLE email_verification_tokens ADD COLUMN otp_code VARCHAR(10) NULL;
