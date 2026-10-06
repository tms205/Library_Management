--liquibase formatted sql

--changeset manh:002-seed-admin

INSERT INTO accounts (
    email,
    password,
    role,
    enabled
)
VALUES (
    'admin@gmail.com',
    '$2a$10$FD3sclOkWYfmduKjmwWNCeqypa2Vyi0Z.Zf41VynMOgf3HEuv/m7W',
    'ADMIN',
    1
);