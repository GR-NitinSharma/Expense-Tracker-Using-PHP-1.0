 -- ============================================================
-- Personal Expense Tracker - Database Setup Script
-- Run this file in phpMyAdmin or MySQL CLI before using the app
-- ============================================================

CREATE DATABASE IF NOT EXISTS expense_tracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE expense_tracker;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Expense categories
CREATE TABLE IF NOT EXISTS categories (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (name) VALUES
  ('Food & Dining'),
  ('Transportation'),
  ('Housing & Rent'),
  ('Utilities'),
  ('Healthcare'),
  ('Entertainment'),
  ('Shopping'),
  ('Education'),
  ('Travel'),
  ('Personal Care'),
  ('Savings & Investments'),
  ('Other');

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    category_id  INT NOT NULL,
    title        VARCHAR(200) NOT NULL,
    amount       DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Sample demo user (password: Demo@1234)
INSERT INTO users (name, email, password) VALUES
  ('Demo User', 'demo@example.com', '$2y$10$rwbIxFeS5K/MGPhPkJvU6.tf.RXlosQYj/eMKiyMeWVTDyq1kxVtO')
  ON DUPLICATE KEY UPDATE password = VALUES(password);

