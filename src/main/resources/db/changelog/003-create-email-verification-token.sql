--liquibase formatted sql

--changeset manh:003-create-email-verification-token


CREATE TABLE email_verification_tokens(
	id BIGINT NOT NULL AUTO_INCREMENT,
	token VARCHAR(255) NOT NULL,
	expires_at DATETIME NOT NULL,
	account_id BIGINT NOT NULL,
	
	PRIMARY KEY(id),
	
	CONSTRAINT uk_email_verification_token
	UNIQUE (token),
	
	CONSTRAINT uk_email_verification_account
    UNIQUE (account_id),
	
	 CONSTRAINT fk_email_verification_account
     FOREIGN KEY (account_id)
     REFERENCES accounts(id)
);