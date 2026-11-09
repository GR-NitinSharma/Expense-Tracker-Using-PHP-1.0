/**
 * Personal Expense Tracker — Main JavaScript
 * Handles: SPA routing, CRUD operations, charts, validation
 */

'use strict';

/* ── Constants & State ──────────────────────────────────── */
const API = {
  auth: 'auth.php',
  expenses: 'expenses.php'
};

const BADGE_COLORS = [
  'badge-purple', 'badge-cyan', 'badge-green',
  'badge-amber', 'badge-red', 'badge-gray'
];

const CHART_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1', '#84cc16', '#64748b'
];

const state = {
  user: null,
  expenses: [],
  categories: [],
  currentPage: 1,
  perPage: 10,
  totalCount: 0,
  totalAmount: 0,
  filters: {
    search: '',
    category_id: '',
    month: '',
    sort: 'expense_date',
    order: 'DESC'
  },
  editId: null,
  pendingDeleteId: null,
  charts: {}
};

/* ── API Helpers ────────────────────────────────────────── */
async function readApiResponse(response) {
  if (!response.ok) {
    throw new Error(`Server error: HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('The server returned an invalid response. Check the PHP error log.');
  }
}

async function apiPost(endpoint, data) {
  const form = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    form.append(key, value ?? '');
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form
  });

  return readApiResponse(response);
}

async function apiGet(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${endpoint}?${query}` : endpoint;
  const response = await fetch(url);

  return readApiResponse(response);
}

/* ── Toast Notifications ────────────────────────────────── */
function showToast(message, type = 'info') {
  const icons = {
    success: '✅',
    danger: '❌',
    info: 'ℹ️'
  };

  const container = document.getElementById('toast-container');

  if (!container) {
    console[type === 'danger' ? 'error' : 'log'](message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ── Escape HTML ────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Format Currency ────────────────────────────────────── */
function formatINR(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) return '₹ 0.00';

  return '₹ ' + value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ── Format Date ────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '-';

  const raw = String(dateStr).trim();

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/
  );

  if (!match) return '-';

  const d = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );

  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* ── Local Date Helpers ─────────────────────────────────── */
function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getLocalMonthValue(date = new Date()) {
  return getLocalDateInputValue(date).slice(0, 7);
}

/* ── Badge Color by Category ────────────────────────────── */
function getBadgeColor(categoryName) {
  const map = {
    'Food & Dining': 'badge-amber',
    'Transportation': 'badge-cyan',
    'Housing & Rent': 'badge-purple',
    'Utilities': 'badge-gray',
    'Healthcare': 'badge-red',
    'Entertainment': 'badge-green',
    'Shopping': 'badge-purple',
    'Education': 'badge-cyan',
    'Travel': 'badge-green',
    'Personal Care': 'badge-amber',
    'Savings & Investments': 'badge-green',
    'Other': 'badge-gray'
  };

  return map[categoryName] || 'badge-gray';
}

/* ── Page Sections ──────────────────────────────────────── */
function showSection(id) {
  document.querySelectorAll('.page-section').forEach(s => {
    s.classList.add('hidden');
  });

  const section = document.getElementById(id);
  if (section) section.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === id);
  });

  const titles = {
    'section-dashboard': 'Dashboard',
    'section-expenses': 'Transactions',
    'section-add': 'Add Expense',
    'section-reports': 'Insights',
    'section-settings': 'Settings'
  };

  // Update topbar subtitle
  const subtitles = {
    'section-dashboard': "Here's what's happening with your finances today.",
    'section-expenses': 'Manage and review all your expense records.',
    'section-add': 'Record a new expense transaction.',
    'section-reports': 'Deep-dive into your spending patterns and financial health.',
    'section-settings': 'Manage your preferences and account options.'
  };
  const subtitleEl = document.getElementById('topbar-subtitle');
  if (subtitleEl) subtitleEl.textContent = subtitles[id] || '';

  // Update greeting (only shown on dashboard)
  const greetEl = document.getElementById('topbar-greeting');
  const firstName = state.user ? state.user.split(' ')[0] : 'User';
  if (greetEl) {
    if (id === 'section-dashboard') {
      greetEl.textContent = `Welcome Back, ${firstName} 👋`;
    } else {
      greetEl.textContent = titles[id] || 'Gravity';
    }
  }

  if (id === 'section-settings') {
    const settingsUser = document.getElementById('settings-username');
    if (settingsUser) settingsUser.textContent = state.user || 'User';
    const settingsThemeIcon = document.getElementById('settings-theme-icon');
    if (settingsThemeIcon) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      settingsThemeIcon.textContent = isDark ? '☀️' : '🌙';
    }
  }

  if (id === 'section-dashboard') loadDashboard();

  if (id === 'section-expenses') {
    state.currentPage = 1;
    loadExpenses();
  }

  if (id === 'section-reports') loadReports();
}

/* ════════════════════════════════════════════════════════════
   AUTHENTICATION
   ════════════════════════════════════════════════════════════ */

async function checkSession() {
  try {
    const res = await apiPost(API.auth, {
      action: 'check'
    });

    if (res.success) {
      state.user = res.name;
      showApp();
    } else {
      showAuth('login');
    }
  } catch (e) {
    showAuth('login');
  }
}

function showAuth(tab) {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('app-page').classList.add('hidden');

  switchAuthTab(tab);
}

function showApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app-page').classList.remove('hidden');

  const firstName = state.user ? state.user.split(' ')[0] : 'User';
  const initials = state.user
    ? state.user.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Sidebar
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  const sidebarUsername = document.getElementById('sidebar-username');
  if (sidebarUsername) sidebarUsername.textContent = state.user || 'User';

  // Topbar Gravity greeting
  const greetEl = document.getElementById('topbar-greeting');
  if (greetEl) greetEl.textContent = `Welcome Back, ${firstName} 👋`;

  // Topbar avatar button
  const topbarAvatarBtn = document.getElementById('topbar-avatar-btn');
  if (topbarAvatarBtn) topbarAvatarBtn.textContent = initials;

  // Settings page username
  const settingsUser = document.getElementById('settings-username');
  if (settingsUser) settingsUser.textContent = state.user || 'User';

  loadCategories();
  showSection('section-dashboard');
}

function switchAuthTab(tab) {
  const isRegister = tab === 'register';

  document.getElementById('login-form-wrap')
    .classList.toggle('hidden', isRegister);

  document.getElementById('register-form-wrap')
    .classList.toggle('hidden', !isRegister);

  document.getElementById('tab-btn-login').classList.toggle('active', !isRegister);
  document.getElementById('tab-btn-login').setAttribute('aria-selected', String(!isRegister));
  document.getElementById('tab-btn-register').classList.toggle('active', isRegister);
  document.getElementById('tab-btn-register').setAttribute('aria-selected', String(isRegister));
  document.getElementById('auth-tab-slider').style.transform = isRegister ? 'translateX(100%)' : '';

  document.getElementById('auth-alert').classList.add('hidden');
}

function fillDemo() {
  switchAuthTab('login');

  document.getElementById('login-email').value = 'demo@example.com';
  document.getElementById('login-password').value = 'Demo@1234';

  document.getElementById('auth-alert').classList.add('hidden');
}

/* ── Login ──────────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const alertEl = document.getElementById('auth-alert');

  clearFormErrors('login-form');

  let valid = true;

  if (!email || !isValidEmail(email)) {
    setFieldError('login-email', 'Enter a valid email address.');
    valid = false;
  }

  if (!password) {
    setFieldError('login-password', 'Password is required.');
    valid = false;
  }

  if (!valid) return;

  const btn = e.target.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    const res = await apiPost(API.auth, {
      action: 'login',
      email,
      password
    });

    if (res.success) {
      state.user = res.name;
      showApp();
    } else {
      alertEl.className = 'alert alert-danger';
      alertEl.innerHTML = `⚠️ ${escapeHtml(res.message)}`;
      alertEl.classList.remove('hidden');
    }
  } catch (err) {
    alertEl.className = 'alert alert-danger';
    alertEl.innerHTML = '⚠️ Connection error. Is the PHP server running?';
    alertEl.classList.remove('hidden');
  } finally {
    setLoading(btn, false);
  }
}

/* ── Register ───────────────────────────────────────────── */
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const alertEl = document.getElementById('auth-alert');

  clearFormErrors('register-form');

  let valid = true;

  if (!name) {
    setFieldError('reg-name', 'Name is required.');
    valid = false;
  }

  if (!isValidEmail(email)) {
    setFieldError('reg-email', 'Enter a valid email.');
    valid = false;
  }

  if (password.length < 6) {
    setFieldError('reg-password', 'Min 6 characters.');
    valid = false;
  }

  if (password !== confirm) {
    setFieldError('reg-confirm', 'Passwords do not match.');
    valid = false;
  }

  if (!valid) return;

  const btn = e.target.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    const res = await apiPost(API.auth, {
      action: 'register',
      name,
      email,
      password,
      confirm
    });

    if (res.success) {
      state.user = res.name;
      showApp();
      showToast('Welcome, ' + res.name + '! 🎉', 'success');
    } else {
      alertEl.className = 'alert alert-danger';
      alertEl.innerHTML = `⚠️ ${escapeHtml(res.message)}`;
      alertEl.classList.remove('hidden');
    }
  } catch (err) {
    alertEl.className = 'alert alert-danger';
    alertEl.innerHTML = '⚠️ Connection error. Is the PHP server running?';
    alertEl.classList.remove('hidden');
  } finally {
    setLoading(btn, false);
  }
}

async function handleLogout() {
  try {
    await apiPost(API.auth, { action: 'logout' });
  } catch (err) {
    showToast(err.message || 'Logout failed.', 'danger');
    return;
  }

  state.user = null;
  showToast('Logged out successfully.', 'info');
  showAuth('login');
}

/* ════════════════════════════════════════════════════════════
   CATEGORIES
   ════════════════════════════════════════════════════════════ */

async function loadCategories() {
  try {
    const res = await apiGet(API.expenses, { action: 'categories' });

    if (!res.success) {
      throw new Error(res.message || 'Unable to load categories.');
    }

    state.categories = Array.isArray(res.categories) ? res.categories : [];
    populateCategorySelects();
  } catch (err) {
    showToast(err.message || 'Could not load categories.', 'danger');
  }
}

function populateCategorySelects() {
  const selects = document.querySelectorAll('.category-select');

  selects.forEach(sel => {
    const current = sel.value;

    sel.innerHTML = '<option value="">All Categories</option>';

    state.categories.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    });

    if (current) sel.value = current;
  });

  const formSels = document.querySelectorAll('.category-form-select');

  formSels.forEach(sel => {
    sel.innerHTML = '<option value="">Select Category</option>';

    state.categories.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    });
  });
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════ */

async function loadDashboard() {
  const month = getLocalMonthValue();

  // Load BOTH: current-month data AND all-time data in parallel
  const [monthRes, allTimeRes] = await Promise.all([
    apiGet(API.expenses, {
      action: 'list',
      month,
      sort: 'expense_date',
      order: 'DESC'
    }),
    apiGet(API.expenses, {
      action: 'list',
      sort: 'expense_date',
      order: 'DESC'
    })
  ]);

  if (!monthRes.success) return;

  // Current-month figures
  const monthTotal   = Number(monthRes.total) || 0;
  const monthCount   = Number(monthRes.count) || 0;

  // All-time figures
  const allTotal     = allTimeRes.success ? (Number(allTimeRes.total) || 0) : monthTotal;
  const allCount     = allTimeRes.success ? (Number(allTimeRes.count) || 0) : monthCount;

  // ── Hero card: "Total Balance" = ALL-TIME total spent ──
  const balanceEl = document.getElementById('dash-balance');
  const trendEl   = document.getElementById('dash-trend');
  if (balanceEl) balanceEl.textContent = formatINR(allTotal);
  if (trendEl)   trendEl.textContent   = allCount > 0
    ? `↗ ${allCount} transaction${allCount !== 1 ? 's' : ''} recorded`
    : '↗ No transactions yet';

  // ── Secondary card 1: "All Expenses" = all-time total + count ──
  const incomeEl    = document.getElementById('dash-income');
  const incomeSubEl = document.getElementById('dash-income-sub');
  if (incomeEl)    incomeEl.textContent    = formatINR(allTotal);
  if (incomeSubEl) incomeSubEl.textContent = `across ${allCount} transaction${allCount !== 1 ? 's' : ''}`;

  // ── Secondary card 2: "This Month" = current-month total ──
  const totalMonthEl = document.getElementById('dash-total-month');
  const countMonthEl = document.getElementById('dash-count-month');
  if (totalMonthEl) totalMonthEl.textContent = formatINR(monthTotal);
  if (countMonthEl) countMonthEl.textContent  = `${monthCount} expense${monthCount !== 1 ? 's' : ''} this month`;

  // ── Charts & budget use month data; recent expenses use all-time ──
  const catRes = await apiGet(API.expenses, {
    action: 'summary',
    month
  });

  if (catRes.success) {
    renderDonutChart('donut-chart', catRes.data);
  }

  const trendRes = await apiGet(API.expenses, {
    action: 'monthly_trend'
  });

  if (trendRes.success) {
    renderLineChart('bar-chart', trendRes.data);
  }

  // Budget health tracks current-month spending vs monthly goal
  updateBudgetTracker(monthTotal);
  updateStatusPill(monthTotal);

  // Recent transactions = latest 5 from all-time list
  const recentList = allTimeRes.success ? allTimeRes.expenses : monthRes.expenses;
  renderRecentExpenses(recentList.slice(0, 5));
}

function updateStatusPill(totalExpenses) {
  const pill = document.getElementById('status-pill');
  if (!pill) return;
  const target = getBudgetGoal();
  const pct = target > 0 ? (totalExpenses / target) * 100 : 0;
  if (pct >= 100) {
    pill.innerHTML = '<span class="status-dot" style="background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,.5)"></span> Status: <strong style="color:#ef4444">Over Budget</strong>';
  } else if (pct >= 80) {
    pill.innerHTML = '<span class="status-dot" style="background:#f59e0b;box-shadow:0 0 6px rgba(245,158,11,.5)"></span> Status: <strong style="color:#f59e0b">Warning</strong>';
  } else {
    pill.innerHTML = '<span class="status-dot"></span> Status: <strong>Healthy</strong>';
  }
}

function renderRecentExpenses(expenses) {
  const tbody = document.getElementById('recent-expenses-body');

  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="4">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No expenses yet</h3>
        <p>Add your first expense to get started!</p>
      </div></td></tr>`;

    return;
  }

  const rowsHtml = expenses.map(e => {
  const safeTitle = escapeHtml(e.title || '-');
  const safeCategory = escapeHtml(e.category || 'Other');
  const safeDate = formatDate(e.expense_date);
  const safeAmount = formatINR(e.amount);
  const badgeClass = getBadgeColor(e.category);
  return `
    <tr>
      <td>
        <div style="font-weight:600">${safeTitle}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${safeDate}</div>
      </td>
      <td>
        <span class="badge ${badgeClass}">${safeCategory}</span>
      </td>
      <td class="amount-cell">${safeAmount}</td>
      <td>
        <button class="btn btn-warning btn-sm btn-icon" title="Edit" onclick="openEditModal(${e.id})">✏️</button>
      </td>
    </tr>`;
}).join('');

tbody.innerHTML = rowsHtml;
}

/* ════════════════════════════════════════════════════════════
   EXPENSE LIST, CRUD AND REPORTS
   ════════════════════════════════════════════════════════════ */

async function loadExpenses() {
  const tbody = document.getElementById('expenses-body');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="page-loader"><div class="loader"></div></div></td></tr>';
  }

  try {
    const params = {
      action: 'list',
      search: state.filters.search,
      category_id: state.filters.category_id,
      month: state.filters.month,
      sort: state.filters.sort,
      order: state.filters.order
    };

    Object.keys(params).forEach(k => {
      if (params[k] === '') delete params[k];
    });

    const res = await apiGet(API.expenses, params);

    if (!res.success) {
      throw new Error(res.message || 'Unable to load expenses.');
    }

    state.expenses = Array.isArray(res.expenses) ? res.expenses : [];
    state.totalAmount = Number(res.total) || 0;
    state.totalCount = Number(res.count) || 0;

    const amountEl = document.getElementById('exp-total-amount');
    const countEl = document.getElementById('exp-total-count');

    if (amountEl) amountEl.textContent = formatINR(state.totalAmount);

    if (countEl) {
      countEl.textContent = `${state.totalCount} record${state.totalCount === 1 ? '' : 's'}`;
    }

    renderExpensesTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
    }

    showToast(err.message || 'Could not load expenses.', 'danger');
  }
}

function renderExpensesTable() {
  const tbody = document.getElementById('expenses-body');
  if (!tbody) return;

  if (!state.expenses.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📭</div><h3>No expenses found</h3><p>Try changing your filters or add an expense.</p></div></td></tr>';
    renderPagination(0);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(state.expenses.length / state.perPage));

  state.currentPage = Math.min(
    Math.max(1, state.currentPage),
    totalPages
  );

  const start = (state.currentPage - 1) * state.perPage;
  const pageRows = state.expenses.slice(start, start + state.perPage);

  tbody.innerHTML = pageRows.map(e => `
    <tr>
      <td>${formatDate(e.expense_date)}</td>
      <td>
        <div style="font-weight:600">${escapeHtml(e.title)}</div>
        ${e.notes ? `<div style="font-size:.75rem;color:var(--text-muted)">${escapeHtml(e.notes)}</div>` : ''}
      </td>
      <td>
        <span class="badge ${getBadgeColor(e.category)}">${escapeHtml(e.category)}</span>
      </td>
      <td class="amount-cell">${formatINR(e.amount)}</td>
      <td style="color:var(--text-muted);font-size:.78rem">${formatDate(e.created_at)}</td>
      <td>
        <div style="display:flex;gap:.35rem">
          <button class="btn btn-warning btn-sm btn-icon"
            title="Edit" onclick="openEditModal(${Number(e.id)})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"
            title="Delete"
            onclick="openDeleteModal(${Number(e.id)}, '${escapeHtml(e.title).replace(/'/g, '&#39;')}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination(state.expenses.length);
}

function renderPagination(total) {
  const info = document.getElementById('page-info');
  const buttons = document.getElementById('page-btns');

  if (!info || !buttons) return;

  const pages = Math.max(1, Math.ceil(total / state.perPage));
  const first = total ? (state.currentPage - 1) * state.perPage + 1 : 0;
  const last = Math.min(state.currentPage * state.perPage, total);

  info.textContent = `Showing ${first}–${last} of ${total}`;
  buttons.innerHTML = '';

  const addButton = (label, page, disabled, active = false) => {
    const b = document.createElement('button');

    b.type = 'button';
    b.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`;
    b.textContent = label;
    b.disabled = disabled;

    b.addEventListener('click', () => {
      state.currentPage = page;
      renderExpensesTable();
    });

    buttons.appendChild(b);
  };

  addButton('‹', state.currentPage - 1, state.currentPage <= 1);

  for (let n = 1; n <= pages; n++) {
    addButton(String(n), n, false, n === state.currentPage);
  }

  addButton('›', state.currentPage + 1, state.currentPage >= pages);
}

function sortBy(column) {
  const allowed = ['expense_date', 'amount', 'title', 'created_at'];

  if (!allowed.includes(column)) return;

  if (state.filters.sort === column) {
    state.filters.order = state.filters.order === 'ASC' ? 'DESC' : 'ASC';
  } else {
    state.filters.sort = column;
    state.filters.order = 'DESC';
  }

  state.currentPage = 1;
  loadExpenses();
}

/* ── Add Expense ────────────────────────────────────────── */
async function handleAddExpense(e) {
  e.preventDefault();

  const form = e.currentTarget;
  clearFormErrors('add-expense-form');

  const data = {
    action: 'add',
    title: document.getElementById('add-title').value.trim(),
    amount: document.getElementById('add-amount').value,
    expense_date: document.getElementById('add-date').value,
    category_id: document.getElementById('add-category').value,
    notes: document.getElementById('add-notes').value.trim()
  };

  if (
    !data.title ||
    !Number.isFinite(Number(data.amount)) ||
    Number(data.amount) <= 0 ||
    !data.expense_date ||
    !data.category_id
  ) {
    showToast('Please complete all required fields with valid values.', 'danger');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    const res = await apiPost(API.expenses, data);

    if (!res.success) {
      throw new Error(res.message || 'Could not save expense.');
    }

    form.reset();
    document.getElementById('add-date').value = getLocalDateInputValue();

    showToast(res.message || 'Expense added successfully!', 'success');
    launchConfetti();

    state.currentPage = 1;

    await loadExpenses();
    await loadDashboard();

    showSection('section-expenses');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setLoading(btn, false);
  }
}

/* ── Edit Expense ───────────────────────────────────────── */
async function openEditModal(id) {
  try {
    const res = await apiGet(API.expenses, {
      action: 'get',
      id
    });

    if (!res.success || !res.expense) {
      throw new Error(res.message || 'Expense not found.');
    }

    const e = res.expense;
    state.editId = Number(e.id);

    document.getElementById('edit-id').value = e.id;
    document.getElementById('edit-title').value = e.title || '';
    document.getElementById('edit-amount').value = e.amount || '';
    document.getElementById('edit-date').value = String(e.expense_date || '').slice(0, 10);
    document.getElementById('edit-category').value = e.category_id || '';
    document.getElementById('edit-notes').value = e.notes || '';

    openModal('modal-edit');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleEditExpense(e) {
  e.preventDefault();
  clearFormErrors('edit-expense-form');

  const data = {
    action: 'update',
    id: document.getElementById('edit-id').value || state.editId,
    title: document.getElementById('edit-title').value.trim(),
    amount: document.getElementById('edit-amount').value,
    expense_date: document.getElementById('edit-date').value,
    category_id: document.getElementById('edit-category').value,
    notes: document.getElementById('edit-notes').value.trim()
  };

  if (
    !data.id ||
    !data.title ||
    !Number.isFinite(Number(data.amount)) ||
    Number(data.amount) <= 0 ||
    !data.expense_date ||
    !data.category_id
  ) {
    showToast('Please complete all required fields with valid values.', 'danger');
    return;
  }

  const btn = e.currentTarget.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    const res = await apiPost(API.expenses, data);

    if (!res.success) {
      throw new Error(res.message || 'Could not update expense.');
    }

    closeModal('modal-edit');
    showToast(res.message || 'Expense updated.', 'success');

    await loadExpenses();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setLoading(btn, false);
  }
}

/* ── Delete Expense ─────────────────────────────────────── */
function openDeleteModal(id, title) {
  state.pendingDeleteId = Number(id);

  const name = document.getElementById('delete-expense-name');

  if (name) {
    name.textContent = title || 'this expense';
  }

  openModal('modal-delete');
}

async function confirmDelete() {
  if (!state.pendingDeleteId) return;

  const btn = document.getElementById('btn-confirm-delete');
  setLoading(btn, true);

  try {
    const res = await apiPost(API.expenses, {
      action: 'delete',
      id: state.pendingDeleteId
    });

    if (!res.success) {
      throw new Error(res.message || 'Could not delete expense.');
    }

    state.pendingDeleteId = null;
    closeModal('modal-delete');

    showToast(res.message || 'Expense deleted.', 'success');

    await loadExpenses();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setLoading(btn, false);
  }
}

/* ── Reports ────────────────────────────────────────────── */
async function loadReports() {
  const month = document.getElementById('report-month')?.value || getLocalMonthValue();

  try {
    const [listRes, catRes, trendRes] = await Promise.all([
      apiGet(API.expenses, {
        action: 'list',
        month,
        sort: 'expense_date',
        order: 'DESC'
      }),
      apiGet(API.expenses, {
        action: 'summary',
        month
      }),
      apiGet(API.expenses, {
        action: 'monthly_trend'
      })
    ]);

    if (!listRes.success) {
      throw new Error(listRes.message || 'Unable to load report.');
    }

    const rows = Array.isArray(listRes.expenses) ? listRes.expenses : [];
    const total = Number(listRes.total) || 0;
    const count = Number(listRes.count) || 0;

    const daysInMonth = 30;
    const dailyAvg = total > 0 ? (total / daysInMonth) : 0;

    const target = getBudgetGoal() || 15000;
    const savingsRate = target > 0 ? Math.max(0, Math.min(100, Math.round(((target - Math.min(target, total)) / target) * 100 * 10) / 10)) : 0;
    const netWorth = Math.max(0, (target * 3) - total);

    // Insight Cards
    const savingsEl = document.getElementById('report-savings-rate');
    if (savingsEl) savingsEl.textContent = savingsRate.toFixed(1) + '%';

    const avgEl = document.getElementById('report-avg');
    if (avgEl) avgEl.textContent = formatINR(dailyAvg);

    const totalEl = document.getElementById('report-total');
    if (totalEl) totalEl.textContent = formatINR(netWorth);

    const countEl = document.getElementById('report-count');
    if (countEl) countEl.textContent = String(count);

    const maxEl = document.getElementById('report-max');
    const maxSubEl = document.getElementById('report-max-sub');

    if (catRes.success && Array.isArray(catRes.data) && catRes.data.length) {
      const sortedCats = [...catRes.data].filter(c => c.total > 0).sort((a, b) => b.total - a.total);
      if (sortedCats.length) {
        if (maxEl) maxEl.textContent = sortedCats[0].category;
        if (maxSubEl) maxSubEl.textContent = `${formatINR(sortedCats[0].total)} total spent`;
      } else {
        if (maxEl) maxEl.textContent = 'None';
        if (maxSubEl) maxSubEl.textContent = 'No expenses this month';
      }
      renderCategoryTable(catRes.data, total);
    } else {
      if (maxEl) maxEl.textContent = 'None';
      if (maxSubEl) maxSubEl.textContent = 'No expenses this month';
      renderCategoryTable([], 0);
    }

    if (trendRes.success && Array.isArray(trendRes.data)) {
      renderIncomeExpenseChart('report-bar', trendRes.data);
      renderLineChart('report-donut', trendRes.data);
    }
  } catch (err) {
    showToast(err.message || 'Could not load reports.', 'danger');
  }
}

function renderCategoryTable(data, grandTotal) {
  const container = document.getElementById('category-breakdown-body');
  if (!container) return;
  const rows = data.filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem">
        <div class="empty-icon">📭</div>
        <h3>No expenses recorded</h3>
        <p>No category spending for this month.</p>
      </div>`;
    return;
  }

  container.innerHTML = rows.map((d, i) => {
    const pct = grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0;
    return `
      <div style="margin-bottom:1.15rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem">
          <div style="font-weight:600;font-size:0.88rem;display:flex;align-items:center;gap:0.5rem;color:var(--text)">
            <span style="color:#7c3aed;font-size:1.1rem;line-height:1">●</span> #${i + 1} ${escapeHtml(d.category)}
          </div>
          <div style="font-weight:700;font-size:0.92rem;color:var(--text)">${formatINR(d.total)}</div>
        </div>
        <div style="width:100%;height:8px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, #7c3aed, #a78bfa);border-radius:99px;transition:width .6s ease"></div>
        </div>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   CHARTS (Canvas-based, no external library)
   ════════════════════════════════════════════════════════════ */

function renderDonutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const W = canvas.width = canvas.offsetWidth || 300;
  const H = canvas.height = canvas.offsetHeight || 260;

  ctx.clearRect(0, 0, W, H);

  const filtered = data.filter(d => d.total > 0);

  if (!filtered.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W / 2, H / 2);
    return;
  }

  const total = filtered.reduce((s, d) => s + d.total, 0);
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.35;
  const inner = radius * 0.55;

  let startAngle = -Math.PI / 2;

  filtered.forEach((d, i) => {
    const slice = (d.total / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();

    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px Poppins, sans-serif';
  ctx.fillText('Total', cx, cy - 8);

  ctx.font = 'bold 13px Poppins, sans-serif';
  ctx.fillStyle = '#4f46e5';
  ctx.fillText(formatINR(total), cx, cy + 10);

  // Legend
  const legendId = canvasId + '-legend';
  let legend = document.getElementById(legendId);

  if (!legend) {
    legend = document.createElement('div');
    legend.id = legendId;
    legend.className = 'legend';
    canvas.parentElement.appendChild(legend);
  }

  legend.innerHTML = filtered.map((d, i) => `
    <div class="legend-item">
      <div class="legend-dot"
        style="background:${CHART_COLORS[i % CHART_COLORS.length]}">
      </div>
      <span>${escapeHtml(d.category)}</span>
    </div>
  `).join('');
}

function renderBarChart(canvasId, data) {
  renderLineChart(canvasId, data);
}

function renderLineChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 400;
  const H = canvas.height = canvas.offsetHeight || 260;

  const pad = {
    top: 24,
    right: 20,
    bottom: 35,
    left: 60
  };

  ctx.clearRect(0, 0, W, H);

  // Values: if data is empty or single point, add clean baseline points
  const rawValues = (data && data.length) ? data.map(d => Number(d.total) || 0) : [];
  const values = rawValues.length > 1 ? rawValues : [rawValues[0] || 2000, (rawValues[0] || 2000) * 1.05];
  const maxVal = Math.max(60000, ...values, 1000);

  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Grid lines
  const steps = 4;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= steps; i++) {
    const y = pad.top + (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();

    const val = Math.round(maxVal - (maxVal / steps) * i);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Poppins, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : String(val), pad.left - 8, y + 3);
  }
  ctx.setLineDash([]);

  // Calculate points
  const points = [];
  const count = Math.max(values.length, 2);
  const stepX = chartW / (count - 1);

  values.forEach((v, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + chartH - (v / maxVal) * chartH;
    points.push({ x, y, val: v });
  });

  if (points.length < 2) return;

  // Draw gradient fill under curve
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + chartH);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const cpX = (points[i].x + points[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
  }

  ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  fillGrad.addColorStop(0, 'rgba(124, 58, 237, 0.18)');
  fillGrad.addColorStop(1, 'rgba(124, 58, 237, 0.01)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Draw smooth line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const cpX = (points[i].x + points[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
  }
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw points & labels
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (data && data[i] && data[i].month) {
      const parts = data[i].month.split('-');
      const lbl = parts.length === 2 ? new Date(parts[0], parts[1] - 1).toLocaleString('en', { month: 'short' }) : data[i].month;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, p.x, H - 10);
    }
  });
}

function renderIncomeExpenseChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 400;
  const H = canvas.height = canvas.offsetHeight || 260;

  const pad = {
    top: 24,
    right: 20,
    bottom: 50,
    left: 60
  };

  ctx.clearRect(0, 0, W, H);

  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const targetBudget = getBudgetGoal() || 50000;
  const months = (data && data.length) ? data.slice(-4) : [{ month: getLocalMonthValue(), total: 2000 }];
  const maxVal = Math.max(targetBudget, ...months.map(m => Number(m.total) * 1.2 || 0), 1000);

  // Grid lines
  const steps = 4;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= steps; i++) {
    const y = pad.top + (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();

    const val = Math.round(maxVal - (maxVal / steps) * i);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Poppins, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : String(val), pad.left - 8, y + 3);
  }
  ctx.setLineDash([]);

  // Group width
  const groupW = chartW / months.length;
  const barW = Math.min(36, groupW * 0.35);

  months.forEach((d, i) => {
    const groupCenterX = pad.left + groupW * i + groupW / 2;
    const expVal = Number(d.total) || 0;
    const incVal = targetBudget;

    // Expense bar (Red #ef4444)
    const expH = (expVal / maxVal) * chartH;
    const expX = groupCenterX - barW - 3;
    const expY = pad.top + chartH - expH;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(expX, expY, barW, Math.max(expH, 2), [6, 6, 0, 0]);
    } else {
      ctx.rect(expX, expY, barW, Math.max(expH, 2));
    }
    ctx.fill();

    // Income bar (Green #10b981)
    const incH = (incVal / maxVal) * chartH;
    const incX = groupCenterX + 3;
    const incY = pad.top + chartH - incH;

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(incX, incY, barW, Math.max(incH, 2), [6, 6, 0, 0]);
    } else {
      ctx.rect(incX, incY, barW, Math.max(incH, 2));
    }
    ctx.fill();

    // Month label
    const parts = (d.month || '').split('-');
    const lbl = parts.length === 2 ? new Date(parts[0], parts[1] - 1).toLocaleString('en', { month: 'short' }) + ' ' + parts[0].slice(2) : d.month;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, groupCenterX, pad.top + chartH + 16);
  });

  // Legend at bottom
  const legendY = H - 12;
  ctx.font = '11px Poppins, sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(W / 2 - 80, legendY - 8, 10, 10);
  ctx.fillStyle = '#64748b';
  ctx.fillText('Expense', W / 2 - 45, legendY);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(W / 2 + 10, legendY - 8, 10, 10);
  ctx.fillStyle = '#64748b';
  ctx.fillText('Income', W / 2 + 45, legendY);
}

/* ════════════════════════════════════════════════════════════
   MODALS
   ════════════════════════════════════════════════════════════ */

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── Sidebar ────────────────────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

/* ════════════════════════════════════════════════════════════
   FORM VALIDATION HELPERS
   ════════════════════════════════════════════════════════════ */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.add('error');

  const err = document.createElement('span');
  err.className = 'field-error';

  err.style.cssText =
    'color:var(--danger);font-size:.75rem;display:block;margin-top:.2rem';

  err.textContent = message;

  field.parentNode.insertAdjacentElement('afterend', err);
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
  });

  form.querySelectorAll('.field-error').forEach(el => {
    el.remove();
  });
}

function setLoading(btn, loading) {
  if (!btn) return;

  btn.disabled = loading;

  if (loading) {
    btn._orig = btn.innerHTML;

    btn.innerHTML =
      '<span class="loader" style="width:16px;height:16px;border-width:2px"></span> Loading…';
  } else {
    btn.innerHTML = btn._orig || btn.innerHTML;
  }
}

/* ════════════════════════════════════════════════════════════
   INTERACTIVE FEATURES: THEME, BUDGET, PRESETS, CSV, CONFETTI
   ════════════════════════════════════════════════════════════ */

/* ── Dark / Light Theme ── */
function initTheme() {
  const saved = localStorage.getItem('theme_preference') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme_preference', theme);

  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (icon && text) {
    if (theme === 'dark') {
      icon.textContent = '☀️';
      text.textContent = 'Light';
    } else {
      icon.textContent = '🌙';
      text.textContent = 'Dark';
    }
  }
}

/* ── Monthly Budget Tracker ── */
function getBudgetGoal() {
  const saved = localStorage.getItem('monthly_budget_target');
  return saved ? Number(saved) : 15000;
}

function promptSetBudget() {
  const current = getBudgetGoal();
  const input = prompt('Enter your monthly budget goal in ₹:', current);
  if (input !== null) {
    const val = Number(input);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('monthly_budget_target', val);
      loadDashboard();
      showToast(`Budget target set to ${formatINR(val)}! 🎯`, 'success');
    } else {
      showToast('Please enter a valid positive number.', 'danger');
    }
  }
}

function updateBudgetTracker(spent) {
  const target = getBudgetGoal();
  const spentEl = document.getElementById('budget-spent-text');
  const targetEl = document.getElementById('budget-target-text');
  const remainingEl = document.getElementById('budget-remaining-text');
  const pctEl = document.getElementById('budget-pct-text');
  const barEl = document.getElementById('budget-bar-fill');
  const badgeEl = document.getElementById('budget-badge');

  if (!barEl) return;

  const pct = target > 0 ? Math.round((spent / target) * 100) : 0;
  const remaining = Math.max(0, target - spent);

  if (spentEl) spentEl.textContent = formatINR(spent);
  if (targetEl) targetEl.textContent = formatINR(target);
  if (remainingEl) remainingEl.textContent = spent > target ? 'Over budget by ' + formatINR(spent - target) : formatINR(remaining);
  if (pctEl) pctEl.textContent = `${pct}% of ₹${target.toLocaleString('en-IN')} used`;

  const barPct = Math.min(100, Math.max(0, pct));
  barEl.style.width = barPct + '%';

  barEl.classList.remove('warning', 'danger');
  if (badgeEl) badgeEl.className = 'budget-badge';

  if (pct >= 100) {
    barEl.classList.add('danger');
    if (badgeEl) {
      badgeEl.classList.add('danger');
      badgeEl.textContent = '🔴 Budget Exceeded';
    }
  } else if (pct >= 80) {
    barEl.classList.add('warning');
    if (badgeEl) {
      badgeEl.classList.add('warning');
      badgeEl.textContent = '🟡 Warning (Near Limit)';
    }
  } else {
    if (badgeEl) {
      badgeEl.classList.add('healthy');
      badgeEl.textContent = '🟢 On Track (Healthy)';
    }
  }
}

/* ── 1-Click Autofill Quick Presets ── */
function applyPreset(title, amount, categoryName) {
  showSection('section-add');
  const titleInp = document.getElementById('add-title');
  const amountInp = document.getElementById('add-amount');
  const catInp = document.getElementById('add-category');

  if (titleInp) titleInp.value = title;
  if (amountInp) amountInp.value = amount;

  if (catInp && state.categories.length) {
    const match = state.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (match) catInp.value = match.id;
  }

  showToast(`Autofilled: ${title} (${formatINR(amount)})`, 'info');
  amountInp?.focus();
}

/* ── Export to CSV ── */
function exportExpensesToCSV() {
  if (!state.expenses || !state.expenses.length) {
    showToast('No expenses found to export.', 'info');
    return;
  }

  const headers = ['ID', 'Date', 'Category', 'Description', 'Amount (INR)', 'Notes', 'Created At'];
  const rows = state.expenses.map(e => [
    e.id,
    e.expense_date,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    e.amount,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    e.created_at
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Expense_Report_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Spreadsheet CSV exported successfully! 📊', 'success');
}

/* ── Confetti Celebration Particle Burst ── */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#e11d48'];

  for (let i = 0; i < 75; i++) {
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * 150,
      y: H / 2 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.rotation += p.rotSpeed;
      p.life -= 0.015;

      if (p.life > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 90) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }
  requestAnimationFrame(animate);
}

/* ════════════════════════════════════════════════════════════
   APPLICATION INITIALIZATION
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Set default date to today
  const today = getLocalDateInputValue();

  const dateInputs = document.querySelectorAll('input[type="date"]');

  dateInputs.forEach(inp => {
    if (!inp.value) {
      inp.value = today;
    }
  });

  // Set default report month
  const reportMonth = document.getElementById('report-month');

  if (reportMonth) {
    reportMonth.value = getLocalMonthValue();
  }

  // ── Authentication forms
  document.getElementById('login-form')
    .addEventListener('submit', handleLogin);

  document.getElementById('register-form')
    .addEventListener('submit', handleRegister);

  // ── Expense forms
  document.getElementById('add-expense-form')
    .addEventListener('submit', handleAddExpense);

  document.getElementById('edit-expense-form')
    .addEventListener('submit', handleEditExpense);

  // ── Filter inputs (debounced)
  let filterTimer;

  const debounce = (fn, ms = 400) => (...args) => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => fn(...args), ms);
  };

  document.getElementById('filter-search')
    .addEventListener('input', debounce(e => {
      state.filters.search = e.target.value.trim();
      state.currentPage = 1;
      loadExpenses();
    }));

  document.getElementById('filter-category')
    .addEventListener('change', e => {
      state.filters.category_id = e.target.value;
      state.currentPage = 1;
      loadExpenses();
    });

  document.getElementById('filter-month')
    .addEventListener('change', e => {
      state.filters.month = e.target.value;
      state.currentPage = 1;
      loadExpenses();
    });

  document.getElementById('filter-clear')
    .addEventListener('click', () => {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-category').value = '';
      document.getElementById('filter-month').value = '';

      state.filters = {
        search: '',
        category_id: '',
        month: '',
        sort: 'expense_date',
        order: 'DESC'
      };

      state.currentPage = 1;
      loadExpenses();
    });

  document.getElementById('report-month')
    .addEventListener('change', loadReports);

  // ── Navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;

      if (section) {
        showSection(section);

        if (window.innerWidth < 900) {
          toggleSidebar();
        }
      }
    });
  });

  // ── Overlay click closes sidebar
  document.getElementById('sidebar-overlay')
    .addEventListener('click', toggleSidebar);

  // ── Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // ── ESC key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
        closeModal(m.id);
      });
    }
  });

  // ── Resize: redraw charts
  let resizeTimer;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      const section = document.querySelector('.page-section:not(.hidden)');

      if (section?.id === 'section-dashboard') {
        loadDashboard();
      }

      if (section?.id === 'section-reports') {
        loadReports();
      }
    }, 300);
  });

  // ── Check session and boot application
  checkSession();
});