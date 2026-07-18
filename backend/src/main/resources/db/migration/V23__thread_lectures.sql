CREATE TABLE thread_lectures (
    id BIGSERIAL PRIMARY KEY,
    thread_type VARCHAR(20) NOT NULL,
    thread_key VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dernier_acces TIMESTAMP NOT NULL,
    CONSTRAINT uk_thread_lecture UNIQUE (thread_type, thread_key, user_id)
);

CREATE INDEX idx_thread_lectures_thread ON thread_lectures(thread_type, thread_key);
