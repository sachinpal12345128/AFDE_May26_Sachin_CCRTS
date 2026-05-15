-- Customer Complaint & Resolution Tracking System — Database Schema
-- Target: SQLite (also works with PostgreSQL with minor type tweaks)
-- The application uses SQLAlchemy to create these tables automatically.

DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS complaint_history;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
    role_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    role_id        INTEGER NOT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE categories (
    category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE complaints (
    complaint_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id       INTEGER NOT NULL,
    category_id       INTEGER NOT NULL,
    subject           VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    priority          VARCHAR(20) NOT NULL DEFAULT 'Medium'
                      CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status            VARCHAR(50) NOT NULL DEFAULT 'Open'
                      CHECK (status IN ('Open','Assigned','In Progress',
                                       'Pending Customer Response',
                                       'Escalated','Resolved','Closed')),
    assigned_to       INTEGER,
    resolution_notes  TEXT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at       DATETIME,
    closed_at         DATETIME,
    FOREIGN KEY (customer_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (assigned_to) REFERENCES users(user_id)
);

CREATE INDEX idx_complaints_status     ON complaints(status);
CREATE INDEX idx_complaints_customer   ON complaints(customer_id);
CREATE INDEX idx_complaints_assigned   ON complaints(assigned_to);
CREATE INDEX idx_complaints_priority   ON complaints(priority);

CREATE TABLE complaint_history (
    history_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id  INTEGER NOT NULL,
    updated_by    INTEGER NOT NULL,
    old_status    VARCHAR(50),
    new_status    VARCHAR(50) NOT NULL,
    comment       TEXT,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by)   REFERENCES users(user_id)
);

CREATE INDEX idx_history_complaint ON complaint_history(complaint_id);

CREATE TABLE feedback (
    feedback_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id  INTEGER NOT NULL UNIQUE,
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments      TEXT,
    submitted_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
);
