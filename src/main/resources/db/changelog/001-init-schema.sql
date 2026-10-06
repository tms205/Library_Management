--liquibase formatted sql

--changeset manh:001-init-schema




CREATE TABLE accounts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    enabled BIT NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'USER') NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_accounts_email UNIQUE (email)
);


CREATE TABLE authors (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,

    PRIMARY KEY (id)
);


CREATE TABLE books (
    id BIGINT NOT NULL AUTO_INCREMENT,
    isbn VARCHAR(20) NOT NULL,
    published_date DATE,
    quantity INT NOT NULL,
    title VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_books_isbn UNIQUE (isbn)
);


CREATE TABLE members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    address VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    account_id BIGINT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_members_account
        UNIQUE (account_id),

    CONSTRAINT fk_members_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
);


CREATE TABLE borrow_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    borrow_date DATE NOT NULL,
    return_date DATE,
    status ENUM('BORROWED', 'RETURNED') NOT NULL,
    book_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_borrow_book
        FOREIGN KEY (book_id)
        REFERENCES books(id),

    CONSTRAINT fk_borrow_member
        FOREIGN KEY (member_id)
        REFERENCES members(id)
);


CREATE TABLE book_authors (
    book_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,

    PRIMARY KEY (book_id, author_id),

    CONSTRAINT fk_book_authors_book
        FOREIGN KEY (book_id)
        REFERENCES books(id),

    CONSTRAINT fk_book_authors_author
        FOREIGN KEY (author_id)
        REFERENCES authors(id)
);