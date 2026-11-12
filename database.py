import sqlite3
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BUNDLED_DB = os.path.join(BASE_DIR, "timetable.db")

def is_vercel_env():
    """Detect if the app is running inside Vercel's read-only serverless environment."""
    return bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))

def get_db_path():
    """
    Return a writable SQLite path.
    Locally: uses timetable.db in the project folder.
    On Vercel: copies bundled timetable.db to /tmp/timetable.db on cold start.
    """
    if is_vercel_env():
        tmp_db = "/tmp/timetable.db"
        if not os.path.exists(tmp_db):
            if os.path.exists(BUNDLED_DB):
                shutil.copyfile(BUNDLED_DB, tmp_db)
            else:
                # Fallback: will be initialized by init_db()
                pass
        return tmp_db
    return BUNDLED_DB

def get_db():
    """
    Connect to the SQLite database and enable foreign key constraints.
    Returns rows as dictionary-like objects (sqlite3.Row).
    """
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """
    Initialize database schema from schema.sql file.
    Creates tables if they do not exist.
    """
    schema_path = os.path.join(BASE_DIR, "schema.sql")
    conn = get_db()
    with open(schema_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    # Initialize default settings if missing
    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = 'institution_type'")
    if not cur.fetchone():
        cur.execute("INSERT INTO settings (key, value) VALUES ('institution_type', 'college')")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
