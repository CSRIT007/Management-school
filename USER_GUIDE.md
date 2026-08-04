# Smile International School — User Guide

School Admin Portal for managing students, classes, stock, finance, and staff.

---

## 1. Getting started

### Sign in

1. Open the app in your browser.
2. Go to the **Login** page.
3. Enter your **email** and **password**.
4. Tap **Sign in**.

You land on the **Dashboard** (or **Financial Overview** if your role is Finance).

### Sign out

Use **Logout** in the top-right header. You will be asked to confirm.

### Session security

- You are logged out automatically after **5 minutes** of no activity.
- After idle logout, the login page explains that your session ended for security.

### Language & appearance

| Control | Where | What it does |
|--------|--------|----------------|
| **EN / ខ្មែរ** | Header or Login | Switch English ↔ Khmer |
| **Theme** | Header or Login | Light / dark mode |
| **Menu** | Header (☰) | Open sidebar (on phone) or collapse sidebar (on desktop) |
| **Search** | Header | Find pages, students, products, or classes |

On phone, open the menu with the hamburger button. On desktop, the sidebar stays on the left.

---

## 2. Roles & access

Your menu only shows pages your role can open.

| Role | Typical use |
|------|-------------|
| **Admin** | Full access, including user accounts and audit log |
| **School Admin** | Day-to-day school ops (students, classes, stock, most finance views) |
| **Finance** | Payments, POS, reports, salary, expenses |
| **Teacher** | Students, classes, attendance, books, graduation (assigned classes) |

### Important limits

- **Create / edit student payments:** Admin and Finance only. School Admin can open the payment page but cannot create or change payments.
- **Manage classes / assign teachers:** Admin and School Admin.
- **User Management & Audit Log:** Admin only.
- **Teachers** see data scoped to their assigned classes where the system enforces that.

---

## 3. Dashboard

**Path:** `/`

- Welcome summary and quick stats (active students, open classes, pending payments, products in stock).
- **Quick access** cards jump to common pages (only those your role can use).

---

## 4. Student Management

### Student Register — `/students/register`

- Add and manage student records (personal info, program, status).
- Use the list to find, view, or update students.

### Class Management — `/students/classes`

- Create and manage classes.
- Assign teachers and view class rosters.
- Teachers appear based on Teacher Info records.

### Class Attendance — `/students/attendance`

- Pick a class and date.
- Mark present / absent (and related statuses) for the roster.
- Save attendance for that day.

### Student & Dateline — `/students/dateline`

- Track student deadlines and tasks (due dates and status).

### Student & Payment — `/students/payment`

- Create invoices and record payments (Admin / Finance).
- Common fee purposes: Tuition, Registration, Books, Exam, Uniform, Activity, Other.
- Payment methods: Cash, Card, QR.
- View and print payment receipts where available.

### Student & Book — `/students/book`

- Issue and return books.
- Track overdue items.

### Student & Finish — `/students/finish`

- Record graduations / program completion.
- Manage alumni / certificate-related records.

**Tip:** Student identity for alumni is unique by **student ID + program**.

---

## 5. Stock Management

### Category — `/stock/category`

- Create product categories used by the shop inventory.

### Product — `/stock/product`

- Add products with price and stock quantity.
- Keep stock levels up to date.

### Point of Sale (POS) — `/stock/pos`

1. Select products to add to the cart.
2. Review quantities and total.
3. Complete the sale and generate an invoice.
4. Print or save the receipt if needed.

### Stock Report — `/stock/report`

- Sales and inventory summaries.
- Useful for low stock and top-selling products.

---

## 6. Finance

Finance pages share date filters and (where allowed) export options.

| Page | Path | Purpose |
|------|------|---------|
| Financial Overview | `/finance/overview` | Snapshot of tuition, POS, salary, expenses |
| Tuition & Fees | `/finance/tuition` | Fee invoices and collections |
| POS Revenue | `/finance/pos-revenue` | Shop / counter sales revenue |
| Pending Payments | `/finance/pending` | Outstanding student invoices |
| Daily Cash Flow | `/finance/cash-flow` | Daily money in vs salary/expenses |
| Payment Methods | `/finance/methods` | Totals by Cash / Card / QR |
| Fee Purpose Report | `/finance/purpose` | Breakdown by fee purpose |
| Monthly Summary | `/finance/monthly` | Month-by-month summary |
| Profit & Loss | `/finance/profit-loss` | Cash-based P&L |
| Student Ledger | `/finance/student-ledger` | One student’s payment history & balance |
| Staff & Teacher Salary | `/finance/salary` | Payroll roster and salary payments |
| School Expenses | `/finance/expenses` | Operating costs (rent, utilities, etc.) |

**Suggested daily flow (Finance)**

1. Check **Pending Payments**.
2. Record tuition payments on **Student & Payment**.
3. Run **POS** sales if the shop is open.
4. Enter **Salary** or **School Expenses** when paid.
5. Review **Daily Cash Flow** and **Profit & Loss** as needed.

---

## 7. Administration

### Teacher Info — `/admin/teachers`

- Teacher profiles and employment details.
- Salary fields support the payroll page.

### Staff Info — `/admin/staff`

- Non-teaching staff profiles (same idea as teachers for HR / payroll).

### User Management — `/admin/users` (Admin only)

- Create login accounts.
- Assign roles: Admin, School Admin, Finance, Teacher.
- Update or disable access as needed.

### Audit Log — `/admin/audit-log` (Admin only)

- Who did what, on which resource, and when.
- Filter by date, action, or user when investigating changes.

---

## 8. Search

1. Click the search box in the header (or use **Ctrl+K** / **⌘K** on desktop).
2. Type a page name, student name/ID, product, or class.
3. Click a result to open it.

Results respect your role (you only see pages you can open).

---

## 9. Mobile use

The portal is responsive (phones and tablets).

- Use the **☰** button to open the menu.
- Tables scroll sideways when needed.
- Prefer portrait mode on phones for forms and lists.

---

## 10. For IT / developers (quick start)

```bash
# 1. Start database
npm run db:up

# 2. Configure env (copy from .env.example)
# 3. Start API
npm run dev:api

# 4. Start frontend
npm run dev
```

Other useful scripts:

| Command | Purpose |
|---------|---------|
| `npm run docker:up` | Full Docker stack |
| `npm run build` | Production frontend build |
| `npm run urls` | Print local URLs |

API health check: `/api/health`

Timezone used by the system: **Asia/Phnom_Penh** (Cambodia).

### First-time demo accounts

If the database has **no users yet**, the system may seed starter accounts (change these before real use):

| Email | Password | Role |
|-------|----------|------|
| `admin@gmail.com` | `123456` | Admin |
| `office@school.csrsms.com` | `123456` | School Admin |
| `finance@school.csrsms.com` | `123456` | Finance |
| `teacher@school.csrsms.com` | `123456` | Teacher |

After go-live, create real users in **User Management** and change or remove demo passwords.

---

## 11. Troubleshooting

| Problem | What to try |
|---------|-------------|
| Cannot open a menu item | Your role may not allow it — ask Admin |
| Logged out unexpectedly | Idle timeout (5 minutes) — sign in again |
| Payment buttons missing | Only Admin / Finance can edit payments |
| Page looks empty / error | Check internet; ask IT to confirm API and database are running |
| Wrong language | Use **EN / ខ្មែរ** in the header |

---

## 12. Support

Contact your school administrator or IT team for account access, role changes, and system issues.

School contacts shown in the app footer (website, email, location) come from the school brand settings.
