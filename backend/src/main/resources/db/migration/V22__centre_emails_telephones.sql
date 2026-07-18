CREATE TABLE centre_emails (
    centre_id BIGINT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    email VARCHAR(255),
    PRIMARY KEY (centre_id, position)
);

CREATE TABLE centre_telephones (
    centre_id BIGINT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    telephone VARCHAR(64),
    PRIMARY KEY (centre_id, position)
);
