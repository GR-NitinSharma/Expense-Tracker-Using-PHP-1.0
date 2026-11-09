<?php
/**
 * Database Configuration & Connection
 * Personal Expense Tracker
 */

define('DB_HOST', '127.0.0.1');
define('DB_USER', 'root');
define('DB_PASS', '');           // <-- Put your MySQL password here if you have one!
define('DB_NAME', 'expense_tracker');
define('DB_PORT', 3307);         // Set to 3307 for XAMPP (or 3306 for standalone MySQL)

function getDBConnection() {
    mysqli_report(MYSQLI_REPORT_OFF);

    // Try connecting with configured port first, with fallback
    $ports = [DB_PORT, 3306, 3307];
    $conn = null;
    $lastError = '';

    foreach (array_unique($ports) as $port) {
        $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, $port);

        if ($conn->connect_errno) {
            // If error 1049 (Unknown database 'expense_tracker'), try creating it automatically
            if ($conn->connect_errno === 1049) {
                $rootConn = @new mysqli(DB_HOST, DB_USER, DB_PASS, '', $port);
                if (!$rootConn->connect_errno) {
                    $rootConn->query("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $rootConn->close();
                    // Try connecting again
                    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, $port);
                }
            }
        }

        if (!$conn->connect_errno) {
            break;
        }
        $lastError = $conn->connect_error;
    }

    // If still failed, output friendly JSON
    if ($conn->connect_errno) {
        $errorMsg = $conn->connect_error ?: $lastError;
        if (strpos($errorMsg, 'Access denied') !== false) {
            $errorMsg = "MySQL Access Denied! Your MySQL server (port " . (defined('DB_PORT') ? DB_PORT : '3306') . ") requires a password. Please open 'includes/db.php' and set DB_PASS to your MySQL root password.";
        } elseif (strpos($errorMsg, 'actively refused') !== false || strpos($errorMsg, 'refused') !== false || $conn->connect_errno === 2002) {
            $errorMsg = "Cannot connect to MySQL server! Please make sure MySQL is started (e.g. click 'Start' next to MySQL in XAMPP Control Panel).";
        }
        echo json_encode([
            'success' => false,
            'message' => $errorMsg
        ]);
        exit;
    }

    $conn->set_charset('utf8mb4');

    // Auto-create tables if they don't exist yet
    initTables($conn);

    return $conn;
}

function initTables($conn) {
    // Create users table
    $conn->query("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    // Create categories table
    $conn->query("CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL UNIQUE
    ) ENGINE=InnoDB");

    // Seed default categories
    $conn->query("INSERT IGNORE INTO categories (name) VALUES
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
        ('Other')");

    // Create expenses table
    $conn->query("CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        expense_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB");

    // Ensure demo user exists with a guaranteed valid hash for password: Demo@1234
    $demoEmail = 'demo@example.com';
    $demoPass  = 'Demo@1234';
    $demoHash  = password_hash($demoPass, PASSWORD_BCRYPT);

    $checkDemo = $conn->prepare("SELECT id FROM users WHERE email = ?");
    if ($checkDemo) {
        $checkDemo->bind_param('s', $demoEmail);
        $checkDemo->execute();
        $checkDemo->store_result();

        if ($checkDemo->num_rows === 0) {
            $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
            $demoName = 'Demo User';
            $stmt->bind_param('sss', $demoName, $demoEmail, $demoHash);
            $stmt->execute();
            $stmt->close();
        } else {
            // Update password hash to make sure it matches Demo@1234
            $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
            $stmt->bind_param('ss', $demoHash, $demoEmail);
            $stmt->execute();
            $stmt->close();
        }
        $checkDemo->close();
    }
}
?>
