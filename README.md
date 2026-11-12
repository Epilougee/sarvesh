# EduSchedule — Faculty & Timetable Management Web App

A clean, fully functional, and modular Faculty & Timetable Management web application designed for schools and colleges. Built with Python Flask, plain SQLite (no complex ORMs), Jinja2 templates, vanilla CSS and JavaScript, and Font Awesome 6 icons.

---

## 1. Setup & Running Instructions

### Prerequisites
- Python 3.9 or newer
- Flask 2.x / 3.x

### Quick Start (One-Click or Manual)

#### Option A: One-Click Execution (Windows)
Double-click [`run.bat`](file:///u:/data%20analyst/sarvesh/run.bat). It will automatically:
1. Verify Python installation.
2. Install Flask if not already installed.
3. Seed realistic demo data if `timetable.db` is missing.
4. Launch your default browser directly to `http://127.0.0.1:5000`.
5. Start the Flask application.

#### Option B: Manual Terminal Execution
1. **Install Flask** (if not already installed):
   ```bash
   pip install flask
   ```
2. **Seed Realistic Demo Data**:
   ```bash
   python seed.py
   ```
3. **Run the Application**:
   ```bash
   python app.py
   ```
4. **Access the App**:
   Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

### Optional Automated Test Suite
To run the automated integration and clash detection test suite:
```bash
python test_app.py
```

---

## 2. Default Login Credentials

| Role | Username / Identifier | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` or `admin@campus.edu` | `admin123` | Full system access: add/edit/delete faculty, subjects, rooms, periods, groups, and build timetables |
| **Faculty** | `ramesh.sharma@campus.edu` | `password123` | Read-only personal portal: weekly timetable grid and daily workload breakdown |
| **Faculty** | `sunita.verma@campus.edu` | `password123` | Read-only personal portal |
| **Faculty** | `ananya.iyer@campus.edu` | `password123` | Read-only personal portal |

---

## 3. Database Entity Relationship (ER) Diagram

```text
       +------------------+             +----------------------+
       |      users       | 1         1 |       faculty        |
       +------------------+-------------+----------------------+
       | id (PK)          |<-----------+| id (PK)              |
       | name             |             | user_id (FK -> users)|
       | email (UNIQUE)   |             | department           |
       | password_hash    |             | designation          |
       | role             |             | phone                |
       +------------------+             +----------------------+
                                                    | 1
                                                    |
                                                    | M
                                        +----------------------+
                                        |   faculty_subjects   |
                                        +----------------------+
                                        | faculty_id (FK)      |
                                        | subject_id (FK)      |
                                        +----------------------+
                                                    | M
                                                    |
                                                    | 1
       +------------------+             +----------------------+
       |      groups      | 1         M |       subjects       |
       +------------------+             +----------------------+
       | id (PK)          |             | id (PK)              |
       | name (UNIQUE)    |             | name                 |
       +------------------+             | code (UNIQUE)        |
                 | 1                    +----------------------+
                 |                                  | 1
                 +-------------------+              |
                                     |              |
                                     v M            v M
                                +---------------------------+
                                |         timetable         |
                                +---------------------------+
                                | id (PK)                   |
                                | group_id (FK -> groups)   |
                                | subject_id (FK -> subjects|
                                | faculty_id (FK -> faculty)|
                                | room_id (FK -> rooms)     |
                                | day (CHECK constraint)    |
                                | timeslot_id (FK -> times) |
                                +---------------------------+
                                     ^ M            ^ M
                                     |              |
                 +-------------------+              |
                 | 1                                | 1
       +------------------+             +----------------------+
       |      rooms       |             |      timeslots       |
       +------------------+             +----------------------+
       | id (PK)          |             | id (PK)              |
       | name (UNIQUE)    |             | label                |
       | capacity         |             | start_time           |
       +------------------+             | end_time             |
                                        +----------------------+
```

---

## 4. 5-Line Explanation of How Clash Detection Works

1. When scheduling a class period, the backend receives the target `group_id`, `faculty_id`, `room_id`, `day`, and `timeslot_id`.
2. First, it queries `timetable` to ensure the student **group** is not already attending another subject in that same day and timeslot.
3. Second, it checks whether the **faculty member** is already booked to teach another group during that period.
4. Third, it verifies that the selected **classroom or lab** is vacant and not occupied by another lecture at that time.
5. If any conflict is found, the transaction is rejected with a descriptive, friendly error message naming the conflicting subject, room, and person; otherwise, the slot is safely inserted.

---

## 5. 8 Likely Viva / Judge Questions with Short Answers

### Q1: Why did you choose plain `sqlite3` instead of an ORM like SQLAlchemy?
**Answer:** Plain `sqlite3` uses raw parameterized SQL queries with zero hidden magic, so a beginner can clearly understand and explain every query, transaction, and foreign key constraint without being shielded by ORM abstractions.

### Q2: How does the application prevent SQL injection vulnerabilities?
**Answer:** Every single database operation uses parameterized query placeholders (`?`) provided by the Python DB-API 2.0. User inputs are passed as separate parameter tuples, ensuring values are never concatenated directly into SQL command strings.

### Q3: How do you handle password security in this project?
**Answer:** Passwords are never stored in plaintext. When an account is created or seeded, `werkzeug.security.generate_password_hash` hashes the password using salt and PBKDF2/SHA256, and `check_password_hash` verifies the hash upon login.

### Q4: How does the single `groups` table support both School and College models?
**Answer:** Both a school class section (e.g., `8-A`) and a college semester division (e.g., `BCA Sem 3 A`) represent a distinct student cohort taking classes together. A simple setting key toggles UI labels and placeholders while reusing the same clean `groups` table without schema changes.

### Q5: What happens to timetable entries if a faculty member or classroom is deleted?
**Answer:** All tables enforce foreign keys with `ON DELETE CASCADE`. If a room or faculty profile is deleted, SQLite automatically deletes any linked timetable slots, maintaining relational integrity without orphaned data.

### Q6: Can a faculty member view or alter another teacher's timetable?
**Answer:** No. Role-based session authentication restricts faculty users to the `/my-timetable` route (which is strictly read-only and queries only rows matching their own `faculty_id`). Admin routes (`/timetable/add`, `/timetable/delete`, etc.) are protected by the `@login_required(role='admin')` decorator.

### Q7: How does print formatting work without external libraries?
**Answer:** We use standard CSS `@media print` rules. When the user clicks the "Print Timetable" button, the stylesheet hides the sidebar, top navigation, search bars, and action buttons, producing a clean, centered paper-ready document.

### Q8: What is the time complexity of the clash detection query?
**Answer:** Each of the three clash queries filters on indexed foreign keys (`(faculty_id, day, timeslot_id)`, `(room_id, day, timeslot_id)`, and `(group_id, day, timeslot_id)`), yielding $O(1)$ to $O(K)$ lookup time (where $K$ is the small number of classes on a given day), ensuring instantaneous validation.

