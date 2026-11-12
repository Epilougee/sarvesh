from functools import wraps
import datetime
import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, g
from werkzeug.security import check_password_hash, generate_password_hash
from database import get_db, init_db, get_db_path, is_postgres

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "timetable-secret-key-mid-semester-project")

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
_pg_initialized = False

# Ensure database is initialized before first request
@app.before_request
def setup_db():
    global _pg_initialized
    if is_postgres():
        if not _pg_initialized:
            init_db()
            _pg_initialized = True
    elif not os.path.exists(get_db_path()):
        init_db()
    g.db = get_db()

@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

# Context processor to inject global variables into templates
@app.context_processor
def inject_globals():
    institution_type = "college"
    if hasattr(g, "db"):
        cur = g.db.cursor()
        cur.execute("SELECT value FROM settings WHERE key = 'institution_type'")
        row = cur.fetchone()
        if row:
            institution_type = row["value"]
    
    group_label = "Class / Section" if institution_type == "school" else "Cohort / Division"
    group_placeholder = "e.g. 8-A or 10-B" if institution_type == "school" else "e.g. BCA Sem 3 A or CSE Sem 5"

    return {
        "current_user": session.get("user"),
        "institution_type": institution_type,
        "group_label": group_label,
        "group_placeholder": group_placeholder,
        "days_of_week": DAYS_OF_WEEK
    }

# Decorator to enforce authentication and role access
def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = session.get("user")
            if not user:
                flash("Please log in to access this page.", "danger")
                return redirect(url_for("login"))
            if role and user.get("role") != role:
                flash("Unauthorized access. You do not have permission for that page.", "danger")
                if user.get("role") == "faculty":
                    return redirect(url_for("my_timetable"))
                return redirect(url_for("dashboard"))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# -------------------------------------------------------------
# Authentication Routes
# -------------------------------------------------------------

# Route: Root URL redirecting based on login status and role
@app.route("/")
def index():
    user = session.get("user")
    if not user:
        return redirect(url_for("login"))
    if user["role"] == "admin":
        return redirect(url_for("dashboard"))
    return redirect(url_for("my_timetable"))

# Route: Login page and form authentication
@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user"):
        return redirect(url_for("index"))

    if request.method == "POST":
        identifier = request.form.get("identifier", "").strip()
        password = request.form.get("password", "").strip()

        if not identifier or not password:
            flash("Please enter both email/username and password.", "danger")
            return render_template("login.html")

        # Allow logging in with either email or 'admin' shortcut
        cur = g.db.cursor()
        if identifier.lower() == "admin":
            cur.execute("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
        else:
            cur.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (identifier,))
        user = cur.fetchone()

        if user and check_password_hash(user["password_hash"], password):
            # Fetch faculty profile id if role is faculty
            faculty_id = None
            if user["role"] == "faculty":
                cur.execute("SELECT id FROM faculty WHERE user_id = ?", (user["id"],))
                fac = cur.fetchone()
                if fac:
                    faculty_id = fac["id"]

            session["user"] = {
                "id": user["id"],
                "faculty_id": faculty_id,
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
            flash(f"Welcome back, {user['name']}!", "success")
            if user["role"] == "admin":
                return redirect(url_for("dashboard"))
            return redirect(url_for("my_timetable"))
        else:
            flash("Invalid credentials. Please verify your email and password.", "danger")

    return render_template("login.html")

# Route: Logout the current user and clear session
@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out successfully.", "success")
    return redirect(url_for("login"))


# -------------------------------------------------------------
# Admin Dashboard & Settings Routes
# -------------------------------------------------------------

# Route: Admin overview dashboard with statistics and today's schedule
@app.route("/dashboard")
@login_required(role="admin")
def dashboard():
    cur = g.db.cursor()

    # 4 Stat cards
    cur.execute("SELECT COUNT(*) AS count FROM faculty")
    faculty_count = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) AS count FROM subjects")
    subject_count = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) AS count FROM groups")
    group_count = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) AS count FROM rooms")
    room_count = cur.fetchone()["count"]

    # Today's classes list
    today_name = datetime.datetime.now().strftime("%A")
    # If today is Sunday, show Monday as reference for a school/college
    query_day = today_name if today_name in DAYS_OF_WEEK else "Monday"

    cur.execute(
        """
        SELECT t.id, t.day, ts.label AS period_label, ts.start_time, ts.end_time,
               g.name AS group_name, s.name AS subject_name, s.code AS subject_code,
               u.name AS faculty_name, r.name AS room_name
        FROM timetable t
        JOIN timeslots ts ON t.timeslot_id = ts.id
        JOIN groups g ON t.group_id = g.id
        JOIN subjects s ON t.subject_id = s.id
        JOIN faculty f ON t.faculty_id = f.id
        JOIN users u ON f.user_id = u.id
        JOIN rooms r ON t.room_id = r.id
        WHERE t.day = ?
        ORDER BY ts.start_time ASC, g.name ASC
        """,
        (query_day,)
    )
    today_classes = cur.fetchall()

    return render_template(
        "dashboard.html",
        faculty_count=faculty_count,
        subject_count=subject_count,
        group_count=group_count,
        room_count=room_count,
        today_classes=today_classes,
        today_name=query_day,
        is_sunday=(today_name not in DAYS_OF_WEEK)
    )

# Route: Toggle institution type between School and College
@app.route("/settings", methods=["GET", "POST"])
@login_required(role="admin")
def settings():
    cur = g.db.cursor()
    if request.method == "POST":
        inst_type = request.form.get("institution_type", "college").strip().lower()
        if inst_type not in ["school", "college"]:
            inst_type = "college"

        cur.execute(
            "INSERT INTO settings (key, value) VALUES ('institution_type', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (inst_type,)
        )
        g.db.commit()
        flash(f"Institution type updated to {inst_type.capitalize()}.", "success")
        return redirect(url_for("settings"))

    cur.execute("SELECT value FROM settings WHERE key = 'institution_type'")
    setting_row = cur.fetchone()
    current_setting = setting_row["value"] if setting_row else "college"

    return render_template("settings.html", current_setting=current_setting)


# -------------------------------------------------------------
# Faculty Management Routes
# -------------------------------------------------------------

# Route: List faculty members with search and assigned subjects
@app.route("/faculty")
@login_required(role="admin")
def faculty_list():
    search_query = request.args.get("q", "").strip()
    cur = g.db.cursor()

    if search_query:
        param = f"%{search_query}%"
        cur.execute(
            """
            SELECT f.id, f.department, f.designation, f.phone, u.name, u.email
            FROM faculty f
            JOIN users u ON f.user_id = u.id
            WHERE u.name LIKE ? OR u.email LIKE ? OR f.department LIKE ?
            ORDER BY u.name ASC
            """,
            (param, param, param)
        )
    else:
        cur.execute(
            """
            SELECT f.id, f.department, f.designation, f.phone, u.name, u.email
            FROM faculty f
            JOIN users u ON f.user_id = u.id
            ORDER BY u.name ASC
            """
        )
    faculty_rows = cur.fetchall()

    # Load subjects mapped for each faculty member
    faculty_data = []
    for fac in faculty_rows:
        cur.execute(
            """
            SELECT s.id, s.name, s.code
            FROM subjects s
            JOIN faculty_subjects fs ON s.id = fs.subject_id
            WHERE fs.faculty_id = ?
            ORDER BY s.code ASC
            """,
            (fac["id"],)
        )
        assigned_subjects = cur.fetchall()
        faculty_data.append({
            "faculty": fac,
            "subjects": assigned_subjects
        })

    # All subjects for the Add/Edit modals
    cur.execute("SELECT * FROM subjects ORDER BY code ASC")
    all_subjects = cur.fetchall()

    return render_template(
        "faculty.html",
        faculty_data=faculty_data,
        all_subjects=all_subjects,
        search_query=search_query
    )

# Route: Add a new faculty member with user account
@app.route("/faculty/add", methods=["POST"])
@login_required(role="admin")
def faculty_add():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "password123").strip()
    department = request.form.get("department", "").strip()
    designation = request.form.get("designation", "").strip()
    phone = request.form.get("phone", "").strip()
    subject_ids = request.form.getlist("subject_ids")

    if not name or not email or not department or not designation:
        flash("Name, email, department, and designation are required.", "danger")
        return redirect(url_for("faculty_list"))

    cur = g.db.cursor()
    # Check if email is already taken
    cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    if cur.fetchone():
        flash(f"A user with email '{email}' already exists.", "danger")
        return redirect(url_for("faculty_list"))

    password_hash = generate_password_hash(password)
    cur.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'faculty')",
        (name, email, password_hash)
    )
    user_id = cur.lastrowid

    cur.execute(
        "INSERT INTO faculty (user_id, department, designation, phone) VALUES (?, ?, ?, ?)",
        (user_id, department, designation, phone)
    )
    faculty_id = cur.lastrowid

    # Assign subjects
    for sid in subject_ids:
        cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)", (faculty_id, sid))

    g.db.commit()
    flash(f"Faculty member '{name}' added successfully.", "success")
    return redirect(url_for("faculty_list"))

# Route: Update an existing faculty member details
@app.route("/faculty/edit/<int:faculty_id>", methods=["POST"])
@login_required(role="admin")
def faculty_edit(faculty_id):
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    department = request.form.get("department", "").strip()
    designation = request.form.get("designation", "").strip()
    phone = request.form.get("phone", "").strip()
    subject_ids = request.form.getlist("subject_ids")

    cur = g.db.cursor()
    cur.execute("SELECT user_id FROM faculty WHERE id = ?", (faculty_id,))
    fac = cur.fetchone()
    if not fac:
        flash("Faculty record not found.", "danger")
        return redirect(url_for("faculty_list"))

    user_id = fac["user_id"]

    # Check email duplicate among other users
    cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (email, user_id))
    if cur.fetchone():
        flash(f"Another user with email '{email}' already exists.", "danger")
        return redirect(url_for("faculty_list"))

    cur.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", (name, email, user_id))
    cur.execute(
        "UPDATE faculty SET department = ?, designation = ?, phone = ? WHERE id = ?",
        (department, designation, phone, faculty_id)
    )

    # Refresh subject associations
    cur.execute("DELETE FROM faculty_subjects WHERE faculty_id = ?", (faculty_id,))
    for sid in subject_ids:
        cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)", (faculty_id, sid))

    g.db.commit()
    flash(f"Faculty '{name}' updated successfully.", "success")
    return redirect(url_for("faculty_list"))

# Route: Delete a faculty member and linked user account
@app.route("/faculty/delete/<int:faculty_id>", methods=["POST"])
@login_required(role="admin")
def faculty_delete(faculty_id):
    cur = g.db.cursor()
    cur.execute("SELECT user_id FROM faculty WHERE id = ?", (faculty_id,))
    fac = cur.fetchone()
    if fac:
        # Deleting the user will cascade delete faculty, faculty_subjects, and timetable entries
        cur.execute("DELETE FROM users WHERE id = ?", (fac["user_id"],))
        g.db.commit()
        flash("Faculty member and associated timetable entries deleted successfully.", "success")
    else:
        flash("Faculty record not found.", "danger")
    return redirect(url_for("faculty_list"))


# -------------------------------------------------------------
# Subjects Management Routes
# -------------------------------------------------------------

# Route: List academic subjects with period and faculty counts
@app.route("/subjects")
@login_required(role="admin")
def subjects_list():
    cur = g.db.cursor()
    cur.execute(
        """
        SELECT s.id, s.name, s.code,
               (SELECT COUNT(*) FROM faculty_subjects fs WHERE fs.subject_id = s.id) AS faculty_count,
               (SELECT COUNT(*) FROM timetable t WHERE t.subject_id = s.id) AS period_count
        FROM subjects s
        ORDER BY s.code ASC
        """
    )
    subjects = cur.fetchall()
    return render_template("subjects.html", subjects=subjects)

# Route: Add a new subject
@app.route("/subjects/add", methods=["POST"])
@login_required(role="admin")
def subjects_add():
    name = request.form.get("name", "").strip()
    code = request.form.get("code", "").strip().upper()

    if not name or not code:
        flash("Both Subject Name and Subject Code are required.", "danger")
        return redirect(url_for("subjects_list"))

    cur = g.db.cursor()
    cur.execute("SELECT id FROM subjects WHERE code = ?", (code,))
    if cur.fetchone():
        flash(f"Subject code '{code}' already exists.", "danger")
        return redirect(url_for("subjects_list"))

    cur.execute("INSERT INTO subjects (name, code) VALUES (?, ?)", (name, code))
    g.db.commit()
    flash(f"Subject '{name} ({code})' added successfully.", "success")
    return redirect(url_for("subjects_list"))

# Route: Edit an existing subject
@app.route("/subjects/edit/<int:subject_id>", methods=["POST"])
@login_required(role="admin")
def subjects_edit(subject_id):
    name = request.form.get("name", "").strip()
    code = request.form.get("code", "").strip().upper()

    if not name or not code:
        flash("Subject name and code cannot be empty.", "danger")
        return redirect(url_for("subjects_list"))

    cur = g.db.cursor()
    cur.execute("SELECT id FROM subjects WHERE code = ? AND id != ?", (code, subject_id))
    if cur.fetchone():
        flash(f"Another subject with code '{code}' already exists.", "danger")
        return redirect(url_for("subjects_list"))

    cur.execute("UPDATE subjects SET name = ?, code = ? WHERE id = ?", (name, code, subject_id))
    g.db.commit()
    flash(f"Subject updated successfully.", "success")
    return redirect(url_for("subjects_list"))

# Route: Delete a subject
@app.route("/subjects/delete/<int:subject_id>", methods=["POST"])
@login_required(role="admin")
def subjects_delete(subject_id):
    cur = g.db.cursor()
    cur.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    g.db.commit()
    flash("Subject deleted successfully.", "success")
    return redirect(url_for("subjects_list"))


# -------------------------------------------------------------
# Groups Management Routes
# -------------------------------------------------------------

# Route: List all student groups / classes
@app.route("/groups")
@login_required(role="admin")
def groups_list():
    cur = g.db.cursor()
    cur.execute(
        """
        SELECT g.id, g.name,
               (SELECT COUNT(*) FROM timetable t WHERE t.group_id = g.id) AS classes_count
        FROM groups g
        ORDER BY g.name ASC
        """
    )
    groups = cur.fetchall()
    return render_template("groups.html", groups=groups)

# Route: Add a new student group / class
@app.route("/groups/add", methods=["POST"])
@login_required(role="admin")
def groups_add():
    name = request.form.get("name", "").strip()
    if not name:
        flash("Group name cannot be empty.", "danger")
        return redirect(url_for("groups_list"))

    cur = g.db.cursor()
    cur.execute("SELECT id FROM groups WHERE LOWER(name) = LOWER(?)", (name,))
    if cur.fetchone():
        flash(f"A group with name '{name}' already exists.", "danger")
        return redirect(url_for("groups_list"))

    cur.execute("INSERT INTO groups (name) VALUES (?)", (name,))
    g.db.commit()
    flash(f"Group '{name}' added successfully.", "success")
    return redirect(url_for("groups_list"))

# Route: Edit an existing group
@app.route("/groups/edit/<int:group_id>", methods=["POST"])
@login_required(role="admin")
def groups_edit(group_id):
    name = request.form.get("name", "").strip()
    if not name:
        flash("Group name cannot be empty.", "danger")
        return redirect(url_for("groups_list"))

    cur = g.db.cursor()
    cur.execute("SELECT id FROM groups WHERE LOWER(name) = LOWER(?) AND id != ?", (name, group_id))
    if cur.fetchone():
        flash(f"Another group named '{name}' already exists.", "danger")
        return redirect(url_for("groups_list"))

    cur.execute("UPDATE groups SET name = ? WHERE id = ?", (name, group_id))
    g.db.commit()
    flash("Group updated successfully.", "success")
    return redirect(url_for("groups_list"))

# Route: Delete a group
@app.route("/groups/delete/<int:group_id>", methods=["POST"])
@login_required(role="admin")
def groups_delete(group_id):
    cur = g.db.cursor()
    cur.execute("DELETE FROM groups WHERE id = ?", (group_id,))
    g.db.commit()
    flash("Group and scheduled classes deleted successfully.", "success")
    return redirect(url_for("groups_list"))


# -------------------------------------------------------------
# Rooms Management Routes
# -------------------------------------------------------------

# Route: List classrooms and laboratories
@app.route("/rooms")
@login_required(role="admin")
def rooms_list():
    cur = g.db.cursor()
    cur.execute(
        """
        SELECT r.id, r.name, r.capacity,
               (SELECT COUNT(*) FROM timetable t WHERE t.room_id = r.id) AS classes_count
        FROM rooms r
        ORDER BY r.name ASC
        """
    )
    rooms = cur.fetchall()
    return render_template("rooms.html", rooms=rooms)

# Route: Add a classroom or lab
@app.route("/rooms/add", methods=["POST"])
@login_required(role="admin")
def rooms_add():
    name = request.form.get("name", "").strip()
    capacity = request.form.get("capacity", "40").strip()

    if not name:
        flash("Room name cannot be empty.", "danger")
        return redirect(url_for("rooms_list"))

    try:
        capacity = int(capacity)
    except ValueError:
        capacity = 40

    cur = g.db.cursor()
    cur.execute("SELECT id FROM rooms WHERE LOWER(name) = LOWER(?)", (name,))
    if cur.fetchone():
        flash(f"Room '{name}' already exists.", "danger")
        return redirect(url_for("rooms_list"))

    cur.execute("INSERT INTO rooms (name, capacity) VALUES (?, ?)", (name, capacity))
    g.db.commit()
    flash(f"Room '{name}' added successfully.", "success")
    return redirect(url_for("rooms_list"))

# Route: Edit room details
@app.route("/rooms/edit/<int:room_id>", methods=["POST"])
@login_required(role="admin")
def rooms_edit(room_id):
    name = request.form.get("name", "").strip()
    capacity = request.form.get("capacity", "40").strip()

    if not name:
        flash("Room name cannot be empty.", "danger")
        return redirect(url_for("rooms_list"))

    try:
        capacity = int(capacity)
    except ValueError:
        capacity = 40

    cur = g.db.cursor()
    cur.execute("SELECT id FROM rooms WHERE LOWER(name) = LOWER(?) AND id != ?", (name, room_id))
    if cur.fetchone():
        flash(f"Another room named '{name}' already exists.", "danger")
        return redirect(url_for("rooms_list"))

    cur.execute("UPDATE rooms SET name = ?, capacity = ? WHERE id = ?", (name, capacity, room_id))
    g.db.commit()
    flash("Room updated successfully.", "success")
    return redirect(url_for("rooms_list"))

# Route: Delete a room
@app.route("/rooms/delete/<int:room_id>", methods=["POST"])
@login_required(role="admin")
def rooms_delete(room_id):
    cur = g.db.cursor()
    cur.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
    g.db.commit()
    flash("Room deleted successfully.", "success")
    return redirect(url_for("rooms_list"))


# -------------------------------------------------------------
# Timeslots Management Routes
# -------------------------------------------------------------

# Route: List all timeslots and periods
@app.route("/timeslots")
@login_required(role="admin")
def timeslots_list():
    cur = g.db.cursor()
    cur.execute("SELECT * FROM timeslots ORDER BY start_time ASC")
    timeslots = cur.fetchall()
    return render_template("timeslots.html", timeslots=timeslots)

# Route: Add a period timeslot
@app.route("/timeslots/add", methods=["POST"])
@login_required(role="admin")
def timeslots_add():
    label = request.form.get("label", "").strip()
    start_time = request.form.get("start_time", "").strip()
    end_time = request.form.get("end_time", "").strip()

    if not label or not start_time or not end_time:
        flash("Period label, start time, and end time are required.", "danger")
        return redirect(url_for("timeslots_list"))

    cur = g.db.cursor()
    cur.execute("INSERT INTO timeslots (label, start_time, end_time) VALUES (?, ?, ?)", (label, start_time, end_time))
    g.db.commit()
    flash(f"Period '{label}' ({start_time} - {end_time}) added successfully.", "success")
    return redirect(url_for("timeslots_list"))

# Route: Edit a period timeslot
@app.route("/timeslots/edit/<int:timeslot_id>", methods=["POST"])
@login_required(role="admin")
def timeslots_edit(timeslot_id):
    label = request.form.get("label", "").strip()
    start_time = request.form.get("start_time", "").strip()
    end_time = request.form.get("end_time", "").strip()

    if not label or not start_time or not end_time:
        flash("Period label, start time, and end time are required.", "danger")
        return redirect(url_for("timeslots_list"))

    cur = g.db.cursor()
    cur.execute(
        "UPDATE timeslots SET label = ?, start_time = ?, end_time = ? WHERE id = ?",
        (label, start_time, end_time, timeslot_id)
    )
    g.db.commit()
    flash("Timeslot updated successfully.", "success")
    return redirect(url_for("timeslots_list"))

# Route: Delete a period timeslot
@app.route("/timeslots/delete/<int:timeslot_id>", methods=["POST"])
@login_required(role="admin")
def timeslots_delete(timeslot_id):
    cur = g.db.cursor()
    cur.execute("DELETE FROM timeslots WHERE id = ?", (timeslot_id,))
    g.db.commit()
    flash("Timeslot deleted successfully.", "success")
    return redirect(url_for("timeslots_list"))


# -------------------------------------------------------------
# Timetable Builder & Clash Detection Routes
# -------------------------------------------------------------

# Helper function: Check timetable clashes before scheduling
def detect_clash(group_id, subject_id, faculty_id, room_id, day, timeslot_id, exclude_id=None):
    """
    Validates whether the assignment produces any conflicts:
    1. Group clash: group already has a class scheduled at (day, timeslot).
    2. Faculty clash: faculty is already teaching another group at (day, timeslot).
    3. Room clash: room is already occupied at (day, timeslot).
    Returns (has_clash: bool, error_message: str)
    """
    cur = g.db.cursor()

    # Get period label for friendly messages
    cur.execute("SELECT label, start_time, end_time FROM timeslots WHERE id = ?", (timeslot_id,))
    slot = cur.fetchone()
    period_info = f"{slot['label']} ({slot['start_time']} - {slot['end_time']})" if slot else f"Period #{timeslot_id}"

    # 1. Check Group Clash (Cell already occupied for this group)
    query = """
        SELECT t.id, g.name AS group_name, s.name AS subject_name, u.name AS faculty_name, r.name AS room_name
        FROM timetable t
        JOIN groups g ON t.group_id = g.id
        JOIN subjects s ON t.subject_id = s.id
        JOIN faculty f ON t.faculty_id = f.id
        JOIN users u ON f.user_id = u.id
        JOIN rooms r ON t.room_id = r.id
        WHERE t.group_id = ? AND t.day = ? AND t.timeslot_id = ?
    """
    params = [group_id, day, timeslot_id]
    if exclude_id:
        query += " AND t.id != ?"
        params.append(exclude_id)
    cur.execute(query, tuple(params))
    group_conflict = cur.fetchone()
    if group_conflict:
        return True, (
            f"Group Clash: {group_conflict['group_name']} already has '{group_conflict['subject_name']}' "
            f"scheduled with {group_conflict['faculty_name']} in {group_conflict['room_name']} on {day} during {period_info}."
        )

    # 2. Check Faculty Clash (Faculty already assigned at this timeslot)
    query = """
        SELECT t.id, g.name AS group_name, s.name AS subject_name, r.name AS room_name, u.name AS faculty_name
        FROM timetable t
        JOIN groups g ON t.group_id = g.id
        JOIN subjects s ON t.subject_id = s.id
        JOIN rooms r ON t.room_id = r.id
        JOIN faculty f ON t.faculty_id = f.id
        JOIN users u ON f.user_id = u.id
        WHERE t.faculty_id = ? AND t.day = ? AND t.timeslot_id = ?
    """
    params = [faculty_id, day, timeslot_id]
    if exclude_id:
        query += " AND t.id != ?"
        params.append(exclude_id)
    cur.execute(query, tuple(params))
    fac_conflict = cur.fetchone()
    if fac_conflict:
        return True, (
            f"Faculty Clash: {fac_conflict['faculty_name']} is already teaching '{fac_conflict['subject_name']}' "
            f"to {fac_conflict['group_name']} in {fac_conflict['room_name']} on {day} during {period_info}."
        )

    # 3. Check Room Clash (Room occupied at this timeslot)
    query = """
        SELECT t.id, g.name AS group_name, s.name AS subject_name, u.name AS faculty_name, r.name AS room_name
        FROM timetable t
        JOIN groups g ON t.group_id = g.id
        JOIN subjects s ON t.subject_id = s.id
        JOIN faculty f ON t.faculty_id = f.id
        JOIN users u ON f.user_id = u.id
        JOIN rooms r ON t.room_id = r.id
        WHERE t.room_id = ? AND t.day = ? AND t.timeslot_id = ?
    """
    params = [room_id, day, timeslot_id]
    if exclude_id:
        query += " AND t.id != ?"
        params.append(exclude_id)
    cur.execute(query, tuple(params))
    room_conflict = cur.fetchone()
    if room_conflict:
        return True, (
            f"Room Clash: '{room_conflict['room_name']}' is already occupied by {room_conflict['group_name']} "
            f"for '{room_conflict['subject_name']}' with {room_conflict['faculty_name']} on {day} during {period_info}."
        )

    return False, ""

# Route: Interactive weekly timetable builder for student groups
@app.route("/timetable/builder")
@login_required(role="admin")
def timetable_builder():
    cur = g.db.cursor()

    # Get all groups
    cur.execute("SELECT * FROM groups ORDER BY name ASC")
    all_groups = cur.fetchall()

    selected_group_id = request.args.get("group_id", type=int)
    if not selected_group_id and all_groups:
        selected_group_id = all_groups[0]["id"]

    # Get timeslots
    cur.execute("SELECT * FROM timeslots ORDER BY start_time ASC")
    timeslots = cur.fetchall()

    # Get all subjects, faculty, and rooms for the assignment modal
    cur.execute("SELECT * FROM subjects ORDER BY name ASC")
    all_subjects = cur.fetchall()

    cur.execute(
        """
        SELECT f.id, u.name, f.department
        FROM faculty f
        JOIN users u ON f.user_id = u.id
        ORDER BY u.name ASC
        """
    )
    all_faculty = cur.fetchall()

    cur.execute("SELECT * FROM rooms ORDER BY name ASC")
    all_rooms = cur.fetchall()

    # Build matrix for selected group: matrix[day][timeslot_id] = entry
    grid_data = {d: {} for d in DAYS_OF_WEEK}
    selected_group = None

    if selected_group_id:
        cur.execute("SELECT * FROM groups WHERE id = ?", (selected_group_id,))
        selected_group = cur.fetchone()

        cur.execute(
            """
            SELECT t.id, t.day, t.timeslot_id, t.subject_id, t.faculty_id, t.room_id,
                   s.name AS subject_name, s.code AS subject_code,
                   u.name AS faculty_name, r.name AS room_name
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            JOIN faculty f ON t.faculty_id = f.id
            JOIN users u ON f.user_id = u.id
            JOIN rooms r ON t.room_id = r.id
            WHERE t.group_id = ?
            """,
            (selected_group_id,)
        )
        for row in cur.fetchall():
            if row["day"] in grid_data:
                grid_data[row["day"]][row["timeslot_id"]] = row

    return render_template(
        "timetable_builder.html",
        groups=all_groups,
        selected_group=selected_group,
        selected_group_id=selected_group_id,
        timeslots=timeslots,
        all_subjects=all_subjects,
        all_faculty=all_faculty,
        all_rooms=all_rooms,
        grid_data=grid_data
    )

# Route: Add an entry to the timetable with clash detection
@app.route("/timetable/add", methods=["POST"])
@login_required(role="admin")
def timetable_add():
    group_id = request.form.get("group_id", type=int)
    subject_id = request.form.get("subject_id", type=int)
    faculty_id = request.form.get("faculty_id", type=int)
    room_id = request.form.get("room_id", type=int)
    day = request.form.get("day", "").strip()
    timeslot_id = request.form.get("timeslot_id", type=int)

    if not all([group_id, subject_id, faculty_id, room_id, day, timeslot_id]):
        flash("All fields (Group, Subject, Faculty, Room, Day, and Timeslot) are required.", "danger")
        return redirect(url_for("timetable_builder", group_id=group_id))

    if day not in DAYS_OF_WEEK:
        flash("Invalid day of the week selected.", "danger")
        return redirect(url_for("timetable_builder", group_id=group_id))

    # Run clash detection
    has_clash, clash_message = detect_clash(group_id, subject_id, faculty_id, room_id, day, timeslot_id)
    if has_clash:
        flash(clash_message, "danger")
        return redirect(url_for("timetable_builder", group_id=group_id))

    cur = g.db.cursor()
    cur.execute(
        """
        INSERT INTO timetable (group_id, subject_id, faculty_id, room_id, day, timeslot_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (group_id, subject_id, faculty_id, room_id, day, timeslot_id)
    )
    g.db.commit()
    flash("Class period successfully scheduled without any clash!", "success")
    return redirect(url_for("timetable_builder", group_id=group_id))

# Route: Delete an entry from the timetable
@app.route("/timetable/delete/<int:timetable_id>", methods=["POST"])
@login_required(role="admin")
def timetable_delete(timetable_id):
    group_id = request.form.get("group_id", type=int)
    cur = g.db.cursor()
    cur.execute("DELETE FROM timetable WHERE id = ?", (timetable_id,))
    g.db.commit()
    flash("Class period removed from timetable.", "success")
    return redirect(url_for("timetable_builder", group_id=group_id))


# -------------------------------------------------------------
# Timetable Viewer & Faculty Portal Routes
# -------------------------------------------------------------

# Route: View timetable grid by Group or by Faculty with print option
@app.route("/timetable/view")
@login_required()
def timetable_view():
    view_type = request.args.get("type", "group")  # 'group' or 'faculty'
    item_id = request.args.get("id", type=int)
    cur = g.db.cursor()

    cur.execute("SELECT * FROM groups ORDER BY name ASC")
    all_groups = cur.fetchall()

    cur.execute(
        """
        SELECT f.id, u.name, f.department
        FROM faculty f
        JOIN users u ON f.user_id = u.id
        ORDER BY u.name ASC
        """
    )
    all_faculty = cur.fetchall()

    cur.execute("SELECT * FROM timeslots ORDER BY start_time ASC")
    timeslots = cur.fetchall()

    selected_item = None
    grid_data = {d: {} for d in DAYS_OF_WEEK}

    if view_type == "faculty":
        if not item_id and all_faculty:
            item_id = all_faculty[0]["id"]
        if item_id:
            cur.execute(
                """
                SELECT f.id, u.name, f.department, f.designation
                FROM faculty f JOIN users u ON f.user_id = u.id
                WHERE f.id = ?
                """,
                (item_id,)
            )
            selected_item = cur.fetchone()

            cur.execute(
                """
                SELECT t.id, t.day, t.timeslot_id, t.subject_id,
                       s.name AS subject_name, s.code AS subject_code,
                       g.name AS group_name, r.name AS room_name
                FROM timetable t
                JOIN subjects s ON t.subject_id = s.id
                JOIN groups g ON t.group_id = g.id
                JOIN rooms r ON t.room_id = r.id
                WHERE t.faculty_id = ?
                """,
                (item_id,)
            )
            for row in cur.fetchall():
                if row["day"] in grid_data:
                    grid_data[row["day"]][row["timeslot_id"]] = row
    else:
        view_type = "group"
        if not item_id and all_groups:
            item_id = all_groups[0]["id"]
        if item_id:
            cur.execute("SELECT * FROM groups WHERE id = ?", (item_id,))
            selected_item = cur.fetchone()

            cur.execute(
                """
                SELECT t.id, t.day, t.timeslot_id, t.subject_id,
                       s.name AS subject_name, s.code AS subject_code,
                       u.name AS faculty_name, r.name AS room_name
                FROM timetable t
                JOIN subjects s ON t.subject_id = s.id
                JOIN faculty f ON t.faculty_id = f.id
                JOIN users u ON f.user_id = u.id
                JOIN rooms r ON t.room_id = r.id
                WHERE t.group_id = ?
                """,
                (item_id,)
            )
            for row in cur.fetchall():
                if row["day"] in grid_data:
                    grid_data[row["day"]][row["timeslot_id"]] = row

    return render_template(
        "timetable_view.html",
        view_type=view_type,
        item_id=item_id,
        selected_item=selected_item,
        all_groups=all_groups,
        all_faculty=all_faculty,
        timeslots=timeslots,
        grid_data=grid_data
    )

# Route: Faculty personal dashboard showing own timetable and weekly workload
@app.route("/my-timetable")
@login_required(role="faculty")
def my_timetable():
    user = session.get("user")
    faculty_id = user.get("faculty_id")

    cur = g.db.cursor()
    if not faculty_id:
        cur.execute("SELECT id FROM faculty WHERE user_id = ?", (user["id"],))
        fac = cur.fetchone()
        if fac:
            faculty_id = fac["id"]

    if not faculty_id:
        flash("Faculty profile not associated with this user account.", "danger")
        return redirect(url_for("logout"))

    cur.execute(
        """
        SELECT f.id, u.name, u.email, f.department, f.designation, f.phone
        FROM faculty f
        JOIN users u ON f.user_id = u.id
        WHERE f.id = ?
        """,
        (faculty_id,)
    )
    faculty_profile = cur.fetchone()

    cur.execute("SELECT * FROM timeslots ORDER BY start_time ASC")
    timeslots = cur.fetchall()

    # Load schedule
    grid_data = {d: {} for d in DAYS_OF_WEEK}
    day_counts = {d: 0 for d in DAYS_OF_WEEK}
    total_periods = 0

    cur.execute(
        """
        SELECT t.id, t.day, t.timeslot_id, t.subject_id,
               s.name AS subject_name, s.code AS subject_code,
               g.name AS group_name, r.name AS room_name
        FROM timetable t
        JOIN subjects s ON t.subject_id = s.id
        JOIN groups g ON t.group_id = g.id
        JOIN rooms r ON t.room_id = r.id
        WHERE t.faculty_id = ?
        """,
        (faculty_id,)
    )
    for row in cur.fetchall():
        if row["day"] in grid_data:
            grid_data[row["day"]][row["timeslot_id"]] = row
            day_counts[row["day"]] += 1
            total_periods += 1

    return render_template(
        "my_timetable.html",
        faculty_profile=faculty_profile,
        timeslots=timeslots,
        grid_data=grid_data,
        day_counts=day_counts,
        total_periods=total_periods
    )

import threading
import webbrowser

def open_browser():
    """Open default web browser after server starts."""
    try:
        webbrowser.open_new("http://127.0.0.1:5000")
    except Exception:
        pass

if __name__ == "__main__":
    init_db()
    # Automatically open the browser without spawning separate command prompt windows
    threading.Timer(1.0, open_browser).start()
    app.run(debug=True, use_reloader=False, host="127.0.0.1", port=5000)
