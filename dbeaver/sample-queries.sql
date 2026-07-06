-- Management School — separate tables (database: management_school, port: 5433)

-- Overview
SELECT label, table_name, row_count FROM table_row_counts;

-- Student
SELECT id, name, email, phone, program, dob FROM students ORDER BY name;

-- Payment
SELECT id, student_name, payment_date, amount, method, status FROM payments ORDER BY payment_date DESC;

-- Class
SELECT id, name, instructor, schedule, capacity FROM classes ORDER BY name;

-- Deadline
SELECT id, student_name, task, due_date, status FROM deadlines ORDER BY due_date;

-- Book
SELECT id, student_name, title, isbn, issued_date, due_date, status FROM book_issues ORDER BY issued_date DESC;

-- Alumni
SELECT id, name, program, completion_date, grade, cert FROM alumni ORDER BY completion_date DESC;

-- Category
SELECT id, name, description FROM categories ORDER BY name;

-- Product
SELECT id, name, category, price, cost, stock, sku FROM products ORDER BY name;

-- Order (+ items)
SELECT o.id, o.customer, o.payment_method, o.total, o.order_date,
       i.product_name, i.qty, i.price
FROM orders o
LEFT JOIN order_items i ON i.order_id = o.id
ORDER BY o.order_date DESC, i.id;
