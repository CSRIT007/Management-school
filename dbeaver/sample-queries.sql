-- Management School — DBeaver (database: management_school, port: 5433)
-- Use *_list views — columns match the web app

-- Overview
SELECT * FROM table_row_counts;

-- Students
SELECT * FROM students_list ORDER BY "Student ID";

-- Classes
SELECT * FROM classes_list ORDER BY "Class ID";

-- Deadlines (Student ID first — same as web page)
SELECT * FROM deadlines_list ORDER BY "Due Date";

-- Payments
SELECT * FROM payments_list ORDER BY "Date" DESC;

-- Raw tables (if needed)
-- SELECT id, student_id, student_name, task, due_date, status FROM deadlines;
