# EduSchedule — Viva & Project Presentation Guide

This guide is prepared specifically for students presenting the **Faculty & Timetable Management System** to project evaluators, professors, or viva examiners.

---

## 1. The 3-Minute Live Project Demonstration Script

When the evaluator asks: *"Show me what you built and how it works."*

### Step 1: Login & Role-Based Access (30 seconds)
1. Open `http://127.0.0.1:5000` in the browser.
2. Log in with **`admin`** / **`admin123`**.
3. Point out:
   > *"The system uses session-based authentication with bcrypt-style password hashing via Werkzeug. Notice the dashboard loads immediately with 4 real-time stat cards and today's schedule for the college."*

### Step 2: The Core Feature — Clash Detection (60 seconds)
1. Click **Timetable Builder** in the sidebar.
2. Select **`BCA Sem 3 A`**.
3. Point to **Monday, Period 1** (already occupied by *CS301 - Data Structures with Dr. Ramesh Sharma in Room 101*).
4. Click an **empty cell**, for example **Monday, Period 2** or switch to another group like **`B.Tech IT Sem 5 A`**.
5. Deliberately attempt to schedule a class with **Dr. Ramesh Sharma** on **Monday Period 1**.
6. Submit the modal.
7. Show the red banner:
   > *"Faculty Clash: Dr. Ramesh Sharma is already teaching 'Data Structures & Algorithms' to BCA Sem 3 A in Room 101 on Monday during Period 1."*
8. Explain to the judge:
   > *"The application enforces three layers of validation: Group conflict, Faculty conflict, and Room conflict before writing to SQLite."*

### Step 3: School vs. College Mode (30 seconds)
1. Go to **Settings** in the sidebar.
2. Switch from **College Model** to **School (K-12) Model** and click **Save Settings**.
3. Point out:
   > *"Notice the sidebar immediately updates from 'Cohort / Divisions' to 'Class / Sections', and helper placeholders change to standard school nomenclature (e.g. 8-A, 10-B). This is achieved using a single `groups` database table without altering the schema or complicating queries."*

### Step 4: Faculty Portal & Workload (45 seconds)
1. Click **Log out**.
2. Log in with a faculty account: **`ramesh.sharma@campus.edu`** / **`password123`**.
3. Show the screen:
   > *"Faculty are automatically routed to their personal timetable. It is strictly read-only and calculates their weekly workload distribution (e.g., 6 periods on Monday, 3 on Tuesday) and average periods per day. They cannot edit schedules or access admin configuration."*
4. Click **Print My Schedule** to show the print-friendly output without sidebars or navigation bars.

---

## 2. Code Walkthrough Guide: Where to Point the Judge

When the judge says: *"Open your code and show me where X is implemented."*

| Feature | File & Function / Line | What to Explain |
| :--- | :--- | :--- |
| **Clash Detection** | `app.py` -> `detect_clash()` | Show the 3 SQL SELECT queries that check `group_id`, `faculty_id`, and `room_id` matching `day` and `timeslot_id`. |
| **Role Authorization** | `app.py` -> `@login_required(role=...)` | Explain the Python decorator wrapping route functions to check `session.get('user')`. |
| **Database Connection** | `database.py` -> `get_db()` | Point out `PRAGMA foreign_keys = ON;` and `conn.row_factory = sqlite3.Row`. |
| **Relational Integrity** | `schema.sql` -> `FOREIGN KEY ... ON DELETE CASCADE` | Explain that deleting a faculty or room automatically cascades to clear orphaned timetable slots. |
| **Pastel Color Logic** | `templates/timetable_builder.html` -> `pastel-{{ (entry.subject_id % 8) + 1 }}` | Explain deterministic styling using modular arithmetic on the subject ID. |
| **Print Stylesheet** | `static/css/style.css` -> `@media print` | Show how `.sidebar`, `.topbar`, and `.btn` are hidden (`display: none !important`). |

---

## 3. Database Normalization Justification (3NF)

Examiners often ask: *"Is your database normalized?"*

**Answer:** Yes, the schema satisfies **Third Normal Form (3NF)**:
1. **1NF (First Normal Form):** Every field holds atomic values (no comma-separated lists of subjects or days).
2. **2NF (Second Normal Form):** All non-key attributes are fully functionally dependent on the entire primary key. The many-to-many relationship between faculty and subjects is properly broken into the junction table `faculty_subjects`.
3. **3NF (Third Normal Form):** There are no transitive dependencies. For example, room capacity depends solely on `room_id`, not on the `timetable` entry; subject names depend on `subject_id`, not on the schedule slot.

---

## 4. Technical Comparison: Why This Architecture?

| Criterion | Chosen Approach | Common Alternative | Why Our Choice is Superior for This Project |
| :--- | :--- | :--- | :--- |
| **Database Access** | Raw `sqlite3` with parameterized queries | SQLAlchemy / Django ORM | Zero dependency overhead, clear SQL queries a beginner can explain, instant execution without migration locks. |
| **Frontend** | Server-rendered Jinja2 + CSS + Vanilla JS | React / Next.js / Tailwind | No `node_modules`, no npm build step, instant page loads, and judges can inspect the actual HTML/CSS in seconds. |
| **Security** | `werkzeug.security` hash + Parameterized SQL | Plain text passwords + String concatenation | Industry-standard protection against SQL injection and credential leaks. |

---

## 5. Quick Reference: Database Tables

```sql
users            -- Authentication accounts (admin & faculty)
faculty          -- Profile details (department, designation, phone)
subjects         -- Course modules (name, code)
groups           -- Classes/sections (School) or Dept/Sem/Div (College)
rooms            -- Lecture halls and labs with capacity
timeslots        -- Bell schedule periods (e.g. Period 1: 09:00 - 09:50)
timetable        -- Schedule links: group + subject + faculty + room + day + slot
faculty_subjects -- Qualified subjects each faculty member can teach
settings         -- Institution configuration ('college' vs 'school')
```

