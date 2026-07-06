-- DBeaver: separate tables with clear labels (no combined records view)

DROP VIEW IF EXISTS records;

COMMENT ON TABLE students IS 'Student — registrations';
COMMENT ON TABLE classes IS 'Class — courses and schedules';
COMMENT ON TABLE deadlines IS 'Deadline — student assignments';
COMMENT ON COLUMN deadlines.id IS 'Deadline ID (e.g. DLN-0001)';
COMMENT ON COLUMN deadlines.student_id IS 'Student ID (e.g. STU-0001) — same as web page';
COMMENT ON COLUMN deadlines.student_name IS 'Student full name';
COMMENT ON TABLE payments IS 'Payment — invoices and fees';
COMMENT ON TABLE book_issues IS 'Book — library issues';
COMMENT ON TABLE alumni IS 'Alumni — graduated students';
COMMENT ON TABLE categories IS 'Category — product categories';
COMMENT ON TABLE products IS 'Product — inventory items';
COMMENT ON TABLE orders IS 'Order — POS sales';
COMMENT ON TABLE order_items IS 'Order item — line items per order';

DROP VIEW IF EXISTS table_row_counts;

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

-- DBeaver: deadlines with Student ID first (matches web page table)
CREATE OR REPLACE VIEW deadlines_list AS
SELECT
  student_id,
  student_name,
  task,
  due_date,
  status,
  id,
  created_at,
  updated_at
FROM deadlines;
