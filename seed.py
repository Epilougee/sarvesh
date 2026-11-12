"""
Seed script to populate realistic demo data for the Timetable Management System.
Run with: python seed.py
"""

from werkzeug.security import generate_password_hash
from database import get_db, init_db

def seed_database():
    init_db()
    conn = get_db()
    cur = conn.cursor()

    # Clear existing data in reverse order of foreign keys
    cur.execute("DELETE FROM timetable")
    cur.execute("DELETE FROM faculty_subjects")
    cur.execute("DELETE FROM faculty")
    cur.execute("DELETE FROM users")
    cur.execute("DELETE FROM subjects")
    cur.execute("DELETE FROM groups")
    cur.execute("DELETE FROM rooms")
    cur.execute("DELETE FROM timeslots")
    cur.execute("DELETE FROM settings")

    # 1. Default Settings
    cur.execute("INSERT INTO settings (key, value) VALUES ('institution_type', 'college')")

    # 2. Admin User
    admin_hash = generate_password_hash("admin123")
    cur.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        ("Dr. Arvind Menon (Admin)", "admin@campus.edu", admin_hash, "admin")
    )

    # 3. Faculty Members (8 realistic faculty members)
    faculty_list = [
        ("Dr. Ramesh Sharma", "ramesh.sharma@campus.edu", "Computer Science", "Professor", "9823011223"),
        ("Prof. Sunita Verma", "sunita.verma@campus.edu", "Mathematics", "Associate Professor", "9823011224"),
        ("Dr. Rajesh Kulkarni", "rajesh.kulkarni@campus.edu", "Electronics & Comm", "Associate Professor", "9823011225"),
        ("Prof. Ananya Iyer", "ananya.iyer@campus.edu", "Computer Science", "Assistant Professor", "9823011226"),
        ("Dr. Amit Joshi", "amit.joshi@campus.edu", "Computer Science", "Assistant Professor", "9823011227"),
        ("Prof. Priya Nair", "priya.nair@campus.edu", "Information Technology", "Assistant Professor", "9823011228"),
        ("Dr. Vikram Deshmukh", "vikram.deshmukh@campus.edu", "Information Technology", "Professor", "9823011229"),
        ("Prof. Neha Gupta", "neha.gupta@campus.edu", "Humanities & Management", "Lecturer", "9823011230"),
    ]

    faculty_ids = {}
    default_faculty_pass = generate_password_hash("password123")
    for name, email, dept, desig, phone in faculty_list:
        cur.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (name, email, default_faculty_pass, "faculty")
        )
        user_id = cur.lastrowid
        cur.execute(
            "INSERT INTO faculty (user_id, department, designation, phone) VALUES (?, ?, ?, ?)",
            (user_id, dept, desig, phone)
        )
        faculty_ids[name] = cur.lastrowid

    # 4. Subjects (6 realistic academic subjects)
    subjects_data = [
        ("Data Structures & Algorithms", "CS301"),
        ("Database Management Systems", "CS302"),
        ("Discrete Mathematics", "MA201"),
        ("Computer Networks", "CS401"),
        ("Operating Systems", "CS303"),
        ("Professional Ethics & Communication", "HU101")
    ]
    subject_ids = {}
    for name, code in subjects_data:
        cur.execute("INSERT INTO subjects (name, code) VALUES (?, ?)", (name, code))
        subject_ids[code] = cur.lastrowid

    # 5. Groups (4 realistic student cohorts)
    groups_data = [
        "BCA Sem 3 A",
        "BCA Sem 3 B",
        "B.Tech CSE Sem 5 A",
        "B.Tech IT Sem 5 A"
    ]
    group_ids = {}
    for gname in groups_data:
        cur.execute("INSERT INTO groups (name) VALUES (?)", (gname,))
        group_ids[gname] = cur.lastrowid

    # 6. Rooms (5 rooms)
    rooms_data = [
        ("Room 101 (Lecture Hall A)", 60),
        ("Room 102 (Lecture Hall B)", 60),
        ("Lab 204 (Computing Lab 1)", 40),
        ("Lab 205 (Computing Lab 2)", 40),
        ("Seminar Hall 1", 120)
    ]
    room_ids = {}
    for rname, cap in rooms_data:
        cur.execute("INSERT INTO rooms (name, capacity) VALUES (?, ?)", (rname, cap))
        room_ids[rname] = cur.lastrowid

    # 7. Timeslots (7 standard periods)
    timeslots_data = [
        ("Period 1", "09:00", "09:50"),
        ("Period 2", "09:55", "10:45"),
        ("Period 3", "10:50", "11:40"),
        ("Period 4", "11:45", "12:35"),
        ("Period 5", "01:25", "02:15"),
        ("Period 6", "02:20", "03:10"),
        ("Period 7", "03:15", "04:05"),
    ]
    timeslot_ids = []
    for label, st, et in timeslots_data:
        cur.execute("INSERT INTO timeslots (label, start_time, end_time) VALUES (?, ?, ?)", (label, st, et))
        timeslot_ids.append(cur.lastrowid)

    # 8. Faculty - Subject Qualifications
    faculty_subj_map = [
        ("Dr. Ramesh Sharma", ["CS301", "CS303"]),
        ("Prof. Sunita Verma", ["MA201"]),
        ("Dr. Rajesh Kulkarni", ["CS401"]),
        ("Prof. Ananya Iyer", ["CS302", "CS301"]),
        ("Dr. Amit Joshi", ["CS303", "CS401"]),
        ("Prof. Priya Nair", ["CS302", "CS401"]),
        ("Dr. Vikram Deshmukh", ["CS301", "CS302"]),
        ("Prof. Neha Gupta", ["HU101"]),
    ]
    for fname, codes in faculty_subj_map:
        f_id = faculty_ids[fname]
        for c in codes:
            s_id = subject_ids[c]
            cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)", (f_id, s_id))

    # 9. Partly filled timetable schedule (Verified clash-free)
    # Entry format: (group_name, subject_code, faculty_name, room_name, day, timeslot_index_1based)
    schedule_entries = [
        # Monday
        ("BCA Sem 3 A", "CS301", "Dr. Ramesh Sharma", "Room 101 (Lecture Hall A)", "Monday", 1),
        ("BCA Sem 3 A", "MA201", "Prof. Sunita Verma", "Room 101 (Lecture Hall A)", "Monday", 2),
        ("BCA Sem 3 A", "CS302", "Prof. Ananya Iyer", "Lab 204 (Computing Lab 1)", "Monday", 3),
        ("BCA Sem 3 A", "HU101", "Prof. Neha Gupta", "Room 101 (Lecture Hall A)", "Monday", 4),
        
        ("BCA Sem 3 B", "MA201", "Prof. Sunita Verma", "Room 102 (Lecture Hall B)", "Monday", 1),
        ("BCA Sem 3 B", "CS302", "Prof. Priya Nair", "Room 102 (Lecture Hall B)", "Monday", 2),
        ("BCA Sem 3 B", "CS301", "Dr. Vikram Deshmukh", "Room 102 (Lecture Hall B)", "Monday", 3),

        ("B.Tech CSE Sem 5 A", "CS401", "Dr. Rajesh Kulkarni", "Seminar Hall 1", "Monday", 1),
        ("B.Tech CSE Sem 5 A", "CS303", "Dr. Amit Joshi", "Lab 205 (Computing Lab 2)", "Monday", 2),
        ("B.Tech CSE Sem 5 A", "CS301", "Dr. Ramesh Sharma", "Seminar Hall 1", "Monday", 5),

        # Tuesday
        ("BCA Sem 3 A", "CS302", "Prof. Ananya Iyer", "Lab 204 (Computing Lab 1)", "Tuesday", 1),
        ("BCA Sem 3 A", "CS303", "Dr. Ramesh Sharma", "Room 101 (Lecture Hall A)", "Tuesday", 2),
        ("BCA Sem 3 A", "MA201", "Prof. Sunita Verma", "Room 101 (Lecture Hall A)", "Tuesday", 3),

        ("BCA Sem 3 B", "CS301", "Dr. Vikram Deshmukh", "Room 102 (Lecture Hall B)", "Tuesday", 1),
        ("BCA Sem 3 B", "HU101", "Prof. Neha Gupta", "Room 102 (Lecture Hall B)", "Tuesday", 2),
        ("BCA Sem 3 B", "CS401", "Prof. Priya Nair", "Room 102 (Lecture Hall B)", "Tuesday", 3),

        ("B.Tech CSE Sem 5 A", "CS303", "Dr. Amit Joshi", "Seminar Hall 1", "Tuesday", 3),
        ("B.Tech CSE Sem 5 A", "CS401", "Dr. Rajesh Kulkarni", "Seminar Hall 1", "Tuesday", 4),

        # Wednesday
        ("BCA Sem 3 A", "CS301", "Dr. Ramesh Sharma", "Room 101 (Lecture Hall A)", "Wednesday", 2),
        ("BCA Sem 3 A", "CS401", "Dr. Rajesh Kulkarni", "Room 101 (Lecture Hall A)", "Wednesday", 3),
        ("BCA Sem 3 A", "CS302", "Prof. Ananya Iyer", "Lab 204 (Computing Lab 1)", "Wednesday", 4),

        ("B.Tech IT Sem 5 A", "CS302", "Prof. Priya Nair", "Lab 205 (Computing Lab 2)", "Wednesday", 1),
        ("B.Tech IT Sem 5 A", "CS301", "Dr. Vikram Deshmukh", "Room 102 (Lecture Hall B)", "Wednesday", 2),
        ("B.Tech IT Sem 5 A", "HU101", "Prof. Neha Gupta", "Room 102 (Lecture Hall B)", "Wednesday", 3),

        # Thursday
        ("BCA Sem 3 A", "MA201", "Prof. Sunita Verma", "Room 101 (Lecture Hall A)", "Thursday", 1),
        ("BCA Sem 3 A", "CS303", "Dr. Ramesh Sharma", "Room 101 (Lecture Hall A)", "Thursday", 2),
        ("BCA Sem 3 B", "CS302", "Prof. Priya Nair", "Lab 204 (Computing Lab 1)", "Thursday", 2),
        ("B.Tech CSE Sem 5 A", "CS301", "Dr. Ramesh Sharma", "Seminar Hall 1", "Thursday", 4),
        ("B.Tech CSE Sem 5 A", "CS401", "Dr. Rajesh Kulkarni", "Seminar Hall 1", "Thursday", 5),

        # Friday
        ("BCA Sem 3 A", "CS301", "Dr. Ramesh Sharma", "Room 101 (Lecture Hall A)", "Friday", 1),
        ("BCA Sem 3 A", "HU101", "Prof. Neha Gupta", "Room 101 (Lecture Hall A)", "Friday", 2),
        ("BCA Sem 3 B", "MA201", "Prof. Sunita Verma", "Room 102 (Lecture Hall B)", "Friday", 3),
        ("B.Tech IT Sem 5 A", "CS401", "Dr. Amit Joshi", "Lab 205 (Computing Lab 2)", "Friday", 4),

        # Saturday
        ("BCA Sem 3 A", "CS302", "Prof. Ananya Iyer", "Lab 204 (Computing Lab 1)", "Saturday", 1),
        ("BCA Sem 3 B", "CS301", "Dr. Vikram Deshmukh", "Room 102 (Lecture Hall B)", "Saturday", 2),
        ("B.Tech CSE Sem 5 A", "CS303", "Dr. Amit Joshi", "Seminar Hall 1", "Saturday", 2),
    ]

    for g_name, s_code, f_name, r_name, day, slot_idx in schedule_entries:
        cur.execute(
            """
            INSERT INTO timetable (group_id, subject_id, faculty_id, room_id, day, timeslot_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                group_ids[g_name],
                subject_ids[s_code],
                faculty_ids[f_name],
                room_ids[r_name],
                day,
                timeslot_ids[slot_idx - 1]
            )
        )

    conn.commit()
    conn.close()
    print("Database successfully seeded with realistic sample data!")

if __name__ == "__main__":
    seed_database()

