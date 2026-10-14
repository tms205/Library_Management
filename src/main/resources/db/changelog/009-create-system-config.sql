--liquibase formatted sql

--changeset hieu:009-create-system-config

CREATE TABLE system_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO system_configs (maintenance_mode)
VALUES (FALSE);