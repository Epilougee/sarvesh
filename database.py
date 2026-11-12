import os
import re
import shutil
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BUNDLED_DB = os.path.join(BASE_DIR, "timetable.db")

_TABLES_WITH_ID = {
    "users",
    "faculty",
    "subjects",
    "groups",
    "rooms",
    "timeslots",
    "timetable",
}
_INSERT_RE = re.compile(r"^\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\b", re.IGNORECASE)


def get_database_url():
    """Return the PostgreSQL connection URL if configured."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def is_postgres():
    """Return True when DATABASE_URL is set (e.g. Supabase PostgreSQL)."""
    return bool(get_database_url())


def is_vercel_env():
    """Detect if the app is running inside Vercel's read-only serverless environment."""
    return bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))


def get_db_path():
    """
    Return a writable SQLite path (used when DATABASE_URL is not set).
    Locally: uses timetable.db in the project folder.
    On Vercel: copies bundled timetable.db to /tmp/timetable.db on cold start.
    """
    if is_vercel_env():
        tmp_db = "/tmp/timetable.db"
        if not os.path.exists(tmp_db) and os.path.exists(BUNDLED_DB):
            shutil.copyfile(BUNDLED_DB, tmp_db)
        return tmp_db
    return BUNDLED_DB


class PostgresCursorWrapper:
    """Adapter so psycopg2 cursors match sqlite3 cursor usage (? placeholders, lastrowid)."""

    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=None):
        pg_query = query.replace("?", "%s")
        self.lastrowid = None

        match = _INSERT_RE.match(pg_query)
        wants_id = (
            match is not None
            and match.group(1).lower() in _TABLES_WITH_ID
            and "RETURNING" not in pg_query.upper()
        )
        if wants_id:
            pg_query = pg_query.rstrip().rstrip(";") + " RETURNING id"

        if params is not None:
            self._cursor.execute(pg_query, params)
        else:
            self._cursor.execute(pg_query)

        if wants_id:
            row = self._cursor.fetchone()
            if row:
                self.lastrowid = row["id"]
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchmany(self, size=None):
        return self._cursor.fetchmany(size)

    def close(self):
        self._cursor.close()

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class PostgresConnectionWrapper:
    """Adapter so psycopg2 connections match sqlite3 connection usage."""

    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor())

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db():
    """
    Connect to PostgreSQL (Supabase) if DATABASE_URL is set, otherwise SQLite.
    Returns rows as dictionary-like objects.
    """
    db_url = get_database_url()
    if db_url:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        kwargs = {"cursor_factory": RealDictCursor}
        if "sslmode=" not in db_url:
            kwargs["sslmode"] = "require"
        conn = psycopg2.connect(db_url, **kwargs)
        return PostgresConnectionWrapper(conn)

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """
    Initialize database schema and default settings.
    Uses schema_pg.sql for PostgreSQL and schema.sql for SQLite.
    """
    if is_postgres():
        schema_path = os.path.join(BASE_DIR, "schema_pg.sql")
        conn = get_db()
        cur = conn.cursor()
        with open(schema_path, "r", encoding="utf-8") as f:
            cur.execute(f.read())
        cur.execute(
            "INSERT INTO settings (key, value) VALUES ('institution_type', 'college') "
            "ON CONFLICT (key) DO NOTHING"
        )
        conn.commit()
        conn.close()
        return

    schema_path = os.path.join(BASE_DIR, "schema.sql")
    conn = get_db()
    with open(schema_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = 'institution_type'")
    if not cur.fetchone():
        cur.execute("INSERT INTO settings (key, value) VALUES ('institution_type', 'college')")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
