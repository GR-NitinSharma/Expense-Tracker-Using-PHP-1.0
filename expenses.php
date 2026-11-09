<?php
/**
 * Expense CRUD API
 * Handles all expense operations: Create, Read, Update, Delete, Search
 */
session_start();
require_once 'includes/db.php';

header('Content-Type: application/json');

// Auth guard
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    /* ─── CREATE EXPENSE ────────────────────────────────────── */
    case 'add':
        $title      = trim($_POST['title']       ?? '');
        $amount     =       $_POST['amount']      ?? '';
        $categoryId = (int)($_POST['category_id'] ?? 0);
        $date       = trim($_POST['expense_date'] ?? '');
        $notes      = trim($_POST['notes']        ?? '');

        // Validation
        $errors = [];
        if (!$title)               $errors[] = 'Title is required.';
        if (!is_numeric($amount) || $amount <= 0) $errors[] = 'Enter a valid positive amount.';
        if (!$categoryId)          $errors[] = 'Category is required.';
        if (!$date || !strtotime($date)) $errors[] = 'Valid date is required.';

        if ($errors) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare(
            'INSERT INTO expenses (user_id, category_id, title, amount, expense_date, notes)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iisdss', $userId, $categoryId, $title, $amount, $date, $notes);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Expense added successfully!', 'id' => $conn->insert_id]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add expense.']);
        }
        $stmt->close(); $conn->close();
        break;

    /* ─── READ / SEARCH EXPENSES ────────────────────────────── */
    case 'list':
        $search     = trim($_GET['search']      ?? '');
        $categoryId = (int)($_GET['category_id'] ?? 0);
        $month      = trim($_GET['month']        ?? '');   // YYYY-MM
        $sortBy     =       $_GET['sort']         ?? 'expense_date';
        $sortOrder  =       $_GET['order']         ?? 'DESC';

        // Whitelist sort columns
        $allowedSort = ['expense_date', 'amount', 'title', 'created_at'];
        if (!in_array($sortBy, $allowedSort)) $sortBy = 'expense_date';
        $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';

        $conn = getDBConnection();
        $where = ['e.user_id = ?'];
        $types = 'i';
        $params = [$userId];

        if ($search) {
            $where[] = '(e.title LIKE ? OR e.notes LIKE ?)';
            $types  .= 'ss';
            $like    = "%$search%";
            $params[] = $like;
            $params[] = $like;
        }
        if ($categoryId) {
            $where[] = 'e.category_id = ?';
            $types  .= 'i';
            $params[] = $categoryId;
        }
        if ($month) {
            $where[] = 'DATE_FORMAT(e.expense_date, "%Y-%m") = ?';
            $types  .= 's';
            $params[] = $month;
        }

        $sql  = "SELECT e.id, e.title, e.amount, e.expense_date, e.notes,
                        c.id AS category_id, c.name AS category,
                        e.created_at, e.updated_at
                   FROM expenses e
                   JOIN categories c ON c.id = e.category_id
                  WHERE " . implode(' AND ', $where) . "
                  ORDER BY $sortBy $sortOrder";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $expenses = [];
        while ($row = $result->fetch_assoc()) {
            $expenses[] = $row;
        }

        // Summary totals
        $totalSql = "SELECT COALESCE(SUM(e.amount),0) AS total,
                            COUNT(*) AS count
                       FROM expenses e
                      WHERE " . implode(' AND ', $where);
        $stmtT = $conn->prepare($totalSql);
        $stmtT->bind_param($types, ...$params);
        $stmtT->execute();
        $summary = $stmtT->get_result()->fetch_assoc();

        echo json_encode([
            'success'  => true,
            'expenses' => $expenses,
            'total'    => (float)$summary['total'],
            'count'    => (int)$summary['count']
        ]);
        $stmt->close(); $stmtT->close(); $conn->close();
        break;

    /* ─── GET SINGLE EXPENSE ────────────────────────────────── */
    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid ID.']); exit; }

        $conn = getDBConnection();
        $stmt = $conn->prepare(
            'SELECT e.*, c.name AS category
               FROM expenses e
               JOIN categories c ON c.id = e.category_id
              WHERE e.id = ? AND e.user_id = ?'
        );
        $stmt->bind_param('ii', $id, $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if ($row) {
            echo json_encode(['success' => true, 'expense' => $row]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Expense not found.']);
        }
        $stmt->close(); $conn->close();
        break;

    /* ─── UPDATE EXPENSE ────────────────────────────────────── */
    case 'update':
        $id         = (int)($_POST['id']         ?? 0);
        $title      = trim($_POST['title']        ?? '');
        $amount     =       $_POST['amount']       ?? '';
        $categoryId = (int)($_POST['category_id'] ?? 0);
        $date       = trim($_POST['expense_date']  ?? '');
        $notes      = trim($_POST['notes']         ?? '');

        $errors = [];
        if (!$id)                  $errors[] = 'Invalid expense ID.';
        if (!$title)               $errors[] = 'Title is required.';
        if (!is_numeric($amount) || $amount <= 0) $errors[] = 'Enter a valid positive amount.';
        if (!$categoryId)          $errors[] = 'Category is required.';
        if (!$date || !strtotime($date)) $errors[] = 'Valid date is required.';

        if ($errors) {
            echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare(
            'UPDATE expenses
                SET category_id=?, title=?, amount=?, expense_date=?, notes=?
              WHERE id=? AND user_id=?'
        );
        $stmt->bind_param('isdssii', $categoryId, $title, $amount, $date, $notes, $id, $userId);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Expense updated successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Update failed or no changes made.']);
        }
        $stmt->close(); $conn->close();
        break;

    /* ─── DELETE EXPENSE ────────────────────────────────────── */
    case 'delete':
        $id = (int)($_POST['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Invalid ID.']); exit; }

        $conn = getDBConnection();
        $stmt = $conn->prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
        $stmt->bind_param('ii', $id, $userId);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Expense deleted successfully!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Delete failed.']);
        }
        $stmt->close(); $conn->close();
        break;

    /* ─── CATEGORY SUMMARY (for charts) ─────────────────────── */
    case 'summary':
        $month = trim($_GET['month'] ?? date('Y-m'));
        $conn  = getDBConnection();
        $stmt  = $conn->prepare(
            "SELECT c.name AS category, COALESCE(SUM(e.amount),0) AS total
               FROM categories c
               LEFT JOIN expenses e
                      ON e.category_id = c.id
                     AND e.user_id = ?
                     AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?
              GROUP BY c.id, c.name
              ORDER BY total DESC"
        );
        $stmt->bind_param('is', $userId, $month);
        $stmt->execute();
        $result = $stmt->get_result();
        $data   = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = ['category' => $row['category'], 'total' => (float)$row['total']];
        }
        echo json_encode(['success' => true, 'data' => $data]);
        $stmt->close(); $conn->close();
        break;

    /* ─── GET CATEGORIES ─────────────────────────────────────── */
    case 'categories':
        $conn   = getDBConnection();
        $result = $conn->query('SELECT * FROM categories ORDER BY name');
        $cats   = [];
        while ($row = $result->fetch_assoc()) $cats[] = $row;
        echo json_encode(['success' => true, 'categories' => $cats]);
        $conn->close();
        break;

    /* ─── MONTHLY TREND ──────────────────────────────────────── */
    case 'monthly_trend':
        $conn = getDBConnection();
        $stmt = $conn->prepare(
            "SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month,
                    SUM(amount) AS total
               FROM expenses
              WHERE user_id = ?
                AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
              GROUP BY month
              ORDER BY month ASC"
        );
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $data   = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = ['month' => $row['month'], 'total' => (float)$row['total']];
        }
        echo json_encode(['success' => true, 'data' => $data]);
        $stmt->close(); $conn->close();
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
}
?>
