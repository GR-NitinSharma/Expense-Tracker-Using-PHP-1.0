# 💰 Personal Expense Tracker
### Web Technologies Major Project

## 📋 Project Overview

A full-stack **Personal Expense Tracker** web application built with **HTML5, CSS3, JavaScript, PHP, and MySQL**. Users can register, log in, add/edit/delete expenses, filter and search, and view spending analytics with charts.

## ✅ Project Requirements Checklist

| Requirement | Status | Details |
|---|---|---|
| HTML5 + CSS3 UI | ✅ Done | Responsive design, CSS custom properties, animations |
| JavaScript Validation | ✅ Done | Client-side form validation, real-time feedback |
| PHP Server-side | ✅ Done | Auth, CRUD operations, session handling |
| MySQL Database | ✅ Done | Full CRUD with prepared statements |
| Search Functionality | ✅ Done | Search by title/notes, filter by category & month |
| Update & Delete | ✅ Done | Edit modal, delete confirmation dialog |
| Testing & Debugging | ✅ Done | Error handling, toast notifications |

## 📁 File Structure

```
expense-tracker/
│
├── index.html              ← Single-page app (SPA) frontend
├── auth.php                ← Login, Register, Logout, Session check
├── expenses.php            ← Expense CRUD API (add/list/get/update/delete)
├── database.sql            ← Database schema & sample data
│
├── css/
│   └── style.css           ← Complete stylesheet (responsive, animated)
│
├── js/
│   └── app.js              ← JavaScript: SPA routing, charts, API calls
│
└── includes/
    └── db.php              ← MySQL connection configuration
```

## 🛠️ Technologies Used

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5 | Semantic page structure |
| **Frontend** | CSS3 | Responsive design, animations, variables |
| **Frontend** | JavaScript (ES6+) | Form validation, AJAX, Charts, SPA routing |
| **Backend** | PHP 8.x | Server-side processing, session management |
| **Database** | MySQL 8.x | Data storage and retrieval (CRUD) |
| **Server** | XAMPP/WAMP | Local development environment |

---

## 🚀 Installation & Setup

### Prerequisites
- **XAMPP** or **WAMP** (Apache + PHP + MySQL)
- A modern web browser (Chrome, Firefox, Edge)

### Step 1 — Copy Project Files
Copy the entire `expense-tracker/` folder into your XAMPP `htdocs` directory:
```
C:\xampp\htdocs\expense-tracker\
```

### Step 2 — Set Up the Database
1. Start XAMPP (Apache + MySQL)
2. Open **phpMyAdmin**: http://localhost/phpmyadmin
3. Click **Import** → Choose file → Select `database.sql`
4. Click **Go** to execute

*Alternatively, paste the SQL into the phpMyAdmin SQL tab and click Go.*

### Step 3 — Configure Database Connection
Open `includes/db.php` and update if needed:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');    // Your MySQL username
define('DB_PASS', '');         // Your MySQL password (empty by default in XAMPP)
define('DB_NAME', 'expense_tracker');
```

### Step 4 — Run the Application
Open your browser and visit:
```
http://localhost/expense-tracker/
```

### Step 5 — Demo Login
A demo account is pre-created:
- **Email:** `demo@example.com`
- **Password:** `Demo@1234`

---

## 🌟 Features

### 🔐 User Authentication
- Register with name, email, and password
- Secure login with bcrypt password hashing
- Session-based authentication
- Client-side + server-side validation

### 💳 Expense Management (Full CRUD)
- **Create:** Add expenses with title, amount, category, date, and notes
- **Read:** View all expenses in a sortable, paginated table
- **Update:** Edit any expense in a smooth modal dialog
- **Delete:** Delete with a confirmation dialog to prevent accidents

### 🔍 Search & Filter
- **Search** by expense title or notes (debounced, real-time)
- **Filter** by category (dropdown)
- **Filter** by month (month picker)
- **Sort** by date, amount, title, or date added (ascending/descending)
- **Clear all** filters with one button

### 📊 Dashboard & Analytics
- This month's total spending
- Largest single expense
- Top spending category
- Donut chart: spending by category
- Bar chart: 6-month spending trend
- Recent 5 expenses at a glance

### 📈 Reports
- Monthly KPIs: total, count, largest, average
- Category breakdown with progress bars
- Interactive charts (built with HTML5 Canvas — no external library)
- Month selector to view any month's data

### 🎨 UI/UX
- Fully **responsive** (works on mobile, tablet, desktop)
- Animated sidebar navigation
- Toast notifications for all actions
- Loading indicators during API calls
- Empty state messages
- Keyboard accessible (ESC to close modals)
- Print-friendly CSS

---

## 🗄️ Database Schema

### `users` table
| Column | Type | Description |
|---|---|---|
| id | INT (PK, AI) | Unique user ID |
| name | VARCHAR(100) | Full name |
| email | VARCHAR(150) | Unique email address |
| password | VARCHAR(255) | Bcrypt hashed password |
| created_at | TIMESTAMP | Registration time |

### `categories` table
| Column | Type | Description |
|---|---|---|
| id | INT (PK, AI) | Unique category ID |
| name | VARCHAR(80) | Category name |

Pre-loaded categories: Food & Dining, Transportation, Housing & Rent, Utilities, Healthcare, Entertainment, Shopping, Education, Travel, Personal Care, Savings & Investments, Other.

### `expenses` table
| Column | Type | Description |
|---|---|---|
| id | INT (PK, AI) | Unique expense ID |
| user_id | INT (FK) | References users.id |
| category_id | INT (FK) | References categories.id |
| title | VARCHAR(200) | Expense description |
| amount | DECIMAL(12,2) | Expense amount in ₹ |
| expense_date | DATE | Date of expense |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

## 🔒 Security Features

- **Prepared Statements** — All SQL queries use `mysqli` prepared statements (prevents SQL injection)
- **Password Hashing** — Passwords stored with `password_hash()` (bcrypt)
- **Session Guard** — All expense API endpoints check for valid session
- **XSS Prevention** — All output escaped with `htmlspecialchars` / `escapeHtml()`
- **Input Validation** — Both client-side (JS) and server-side (PHP) validation

---

## 📡 API Reference

All responses are JSON objects with a `success` boolean.

### Auth Endpoints (`auth.php`)
| Action | Method | Parameters | Description |
|---|---|---|---|
| `login` | POST | email, password | Authenticate user |
| `register` | POST | name, email, password, confirm | Create new account |
| `logout` | POST | — | Destroy session |
| `check` | POST | — | Check login status |

### Expense Endpoints (`expenses.php`)
| Action | Method | Parameters | Description |
|---|---|---|---|
| `add` | POST | title, amount, category_id, expense_date, notes | Create expense |
| `list` | GET | search, category_id, month, sort, order | Get all expenses |
| `get` | GET | id | Get single expense |
| `update` | POST | id, title, amount, category_id, expense_date, notes | Edit expense |
| `delete` | POST | id | Delete expense |
| `summary` | GET | month | Category totals for month |
| `categories` | GET | — | List all categories |
| `monthly_trend` | GET | — | 6-month spending data |

---

## 👨‍💻 Developer Notes

- The frontend is a **Single Page Application (SPA)** — all sections are rendered in one HTML file and toggled via JavaScript
- Charts are drawn using the **HTML5 Canvas API** (no Chart.js or external library needed)
- The app uses the **Fetch API** with FormData for all AJAX requests
- All monetary values are in **Indian Rupees (₹)** with `en-IN` locale formatting
- The pagination is purely client-side (data is fetched all at once, then paginated in JS)

---

## 📸 Screens

| Screen | Description |
|---|---|
| Login / Register | Auth page with tab switching |
| Dashboard | Stats cards + charts + recent expenses |
| My Expenses | Searchable, filterable, paginated table |
| Add Expense | Clean form with validation |
| Reports | Monthly analytics with charts + category table |
| Edit Modal | Inline editing in a modal dialog |
| Delete Confirm | Safety confirmation before deletion |

---

*Thank you for exploring Gravity! Take control of your finances, track your expenses, and make smarter financial decisions.*

