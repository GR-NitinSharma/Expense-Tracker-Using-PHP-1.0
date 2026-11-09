<?php
/**
 * Authentication Handler
 * Handles login, register, and logout via POST requests
 */
session_start();
require_once 'includes/db.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? '';

switch ($action) {

    /* ─── REGISTER ─────────────────────────────────────────── */
    case 'register':
        $name     = trim($_POST['name']     ?? '');
        $email    = trim($_POST['email']    ?? '');
        $password =       $_POST['password'] ?? '';
        $confirm  =       $_POST['confirm']  ?? '';

        // Validation
        if (!$name || !$email || !$password || !$confirm) {
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
            exit;
        }
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
            exit;
        }
        if ($password !== $confirm) {
            echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Email already registered.']);
            $stmt->close(); $conn->close(); exit;
        }
        $stmt->close();

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $conn->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        $stmt->bind_param('sss', $name, $email, $hash);

        if ($stmt->execute()) {
            $userId = $conn->insert_id;
            $_SESSION['user_id']   = $userId;
            $_SESSION['user_name'] = $name;
            echo json_encode(['success' => true, 'message' => 'Registration successful!', 'name' => $name]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Registration failed. Please try again.']);
        }
        $stmt->close(); $conn->close();
        break;

    /* ─── LOGIN ─────────────────────────────────────────────── */
    case 'login':
        $email    = trim($_POST['email']    ?? '');
        $password =       $_POST['password'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare('SELECT id, name, password FROM users WHERE email = ?');
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $stmt->bind_result($id, $name, $hash);
        $stmt->fetch();
        $stmt->close();
        $conn->close();

        if ($id && password_verify($password, $hash)) {
            $_SESSION['user_id']   = $id;
            $_SESSION['user_name'] = $name;
            echo json_encode(['success' => true, 'message' => 'Login successful!', 'name' => $name]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
        }
        break;

    /* ─── LOGOUT ─────────────────────────────────────────────── */
    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    /* ─── SESSION CHECK ──────────────────────────────────────── */
    case 'check':
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['success' => true, 'name' => $_SESSION['user_name']]);
        } else {
            echo json_encode(['success' => false]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
}
?>

