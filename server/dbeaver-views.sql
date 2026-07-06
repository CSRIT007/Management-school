-- DBeaver helpers — run on API start or paste in SQL Editor (database: management_school)
-- Tip: use *_list views in DBeaver — column names match the web app

DROP VIEW IF EXISTS records;
DROP VIEW IF EXISTS deadlines_list;
DROP VIEW IF EXISTS students_list;
DROP VIEW IF EXISTS payments_list;
DROP VIEW IF EXISTS classes_list;
DROP VIEW IF EXISTS table_row_counts;

-- Table labels
COMMENT ON TABLE students IS 'Student — registrations';
COMMENT ON TABLE classes IS 'Class — courses and schedules';
COMMENT ON TABLE deadlines IS 'Deadline — student assignments';
COMMENT ON TABLE payments IS 'Payment — invoices and fees';
COMMENT ON TABLE book_issues IS 'Book — library issues';
COMMENT ON TABLE alumni IS 'Alumni — graduated students';
COMMENT ON TABLE categories IS 'Category — product categories';
COMMENT ON TABLE products IS 'Product — inventory items';
COMMENT ON TABLE orders IS 'Order — POS sales';
COMMENT ON TABLE order_items IS 'Order item — line items per order';

-- Column labels (ID fields)
COMMENT ON COLUMN students.id IS 'Student ID (e.g. STU-0001)';
COMMENT ON COLUMN classes.id IS 'Class ID (e.g. CLS-0001)';
COMMENT ON COLUMN deadlines.id IS 'Deadline ID (e.g. DLN-0001)';
COMMENT ON COLUMN deadlines.student_id IS 'Student ID (e.g. STU-0001)';
COMMENT ON COLUMN deadlines.student_name IS 'Student full name';
COMMENT ON COLUMN payments.id IS 'Invoice # (e.g. INV-1001)';
COMMENT ON COLUMN payments.purpose IS 'Payment purpose';
COMMENT ON COLUMN payments.note IS 'Invoice note';

-- Row counts per table
CREATE VIEW table_row_counts AS
SELECT 'students' AS table_name, 'Student' AS label, COUNT(*)::bigint AS row_count FROM students
UNION ALL SELECT 'classes', 'Class', COUNT(*) FROM classes
UNION ALL SELECT 'deadlines', 'Deadline', COUNT(*) FROM deadlines
UNION ALL SELECT 'payments', 'Payment', COUNT(*) FROM payments
UNION ALL SELECT 'book_issues', 'Book', COUNT(*) FROM book_issues
UNION ALL SELECT 'alumni', 'Alumni', COUNT(*) FROM alumni
UNION ALL SELECT 'categories', 'Category', COUNT(*) FROM categories
UNION ALL SELECT 'products', 'Product', COUNT(*) FROM products
UNION ALL SELECT 'orders', 'Order', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', 'Order item', COUNT(*) FROM order_items
ORDER BY label;

-- Students (matches Register page)
CREATE VIEW students_list AS
SELECT
  id AS "Student ID",
  name AS "Name",
  email AS "Email",
  phone AS "Phone",
  program AS "Program",
  dob AS "Date of Birth",
  address AS "Address",
  emergency AS "Emergency Contact",
  created_at,
  updated_at
FROM students;

-- Classes (matches Class Management page)
CREATE VIEW classes_list AS
SELECT
  id AS "Class ID",
  name AS "Class Name",
  instructor AS "Instructor",
  schedule AS "Schedule",
  capacity AS "Capacity",
  created_at,
  updated_at
FROM classes;

-- Deadlines (matches Dateline page — Student ID first)
CREATE VIEW deadlines_list AS
SELECT
  student_id AS "Student ID",
  student_name AS "Student Name",
  task AS "Task",
  due_date AS "Due Date",
  status AS "Status",
  id AS "Deadline ID",
  created_at,
  updated_at
FROM deadlines;

-- Payments (matches Payment page)
CREATE VIEW payments_list AS
SELECT
  id AS "Invoice #",
  student_name AS "Student Name",
  payment_date AS "Date",
  purpose AS "Purpose",
  amount AS "Amount",
  method AS "Method",
  status AS "Status",
  note AS "Note",
  created_at,
  updated_at
FROM payments;
