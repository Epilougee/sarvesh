# Project Memory — Academic Timetable & Faculty Management Portal

This file serves as the persistent technical memory and reference for this project across development, local demos, and Vercel deployment.

---

## 1. Project Identity & Purpose
- **Application:** Faculty & Timetable Management Web App (supports both **School** and **College** modes).
- **Target Audience:** Mid-semester academic project; intentionally kept simple, readable, and free of over-engineering so a first-year student can explain every file.
- **Core Rule:** Zero ORM, zero frontend build step, parameterized SQL queries only.

---

## 2. Tech Stack
- **Backend:** Python Flask (`app.py`)
- **Database:** SQLite via Python's built-in `sqlite3` (`database.py`, `schema.sql`, `seed.py`)
- **Frontend:** Jinja2 templates (`templates/`), single stylesheet (`static/css/style.css`), vanilla JS (`static/js/main.js`)
- **UI Assets:** Inter font (Google Fonts) + Font Awesome 6 (CDN)

---

## 3. Vercel Deployment Architecture
- **Entry Point:** `app.py` (exported Flask `app` instance).
- **Routing:** `vercel.json` uses `@vercel/python` (`builds` + `routes`) to route `/(.*)` directly to `app.py`, preserving original request paths (`/`, `/login`, `/static/...`, etc.).
- **Dependencies:** `requirements.txt` (`Flask>=3.0.0`, `Werkzeug>=3.0.0`).
- **SQLite Read-Only Filesystem Handling (`database.py`):**
  - Vercel's `/var/task` deployment directory is **read-only**.
  - `database.py` detects Vercel via `VERCEL` or `VERCEL_ENV` environment variables.
  - On Vercel cold starts, `get_db_path()` copies the bundled `timetable.db` into `/tmp/timetable.db` (which is writable).
  - Locally, `get_db_path()` uses `timetable.db` directly in the project root.
  - Note: Writes on Vercel persist for the lifetime of the warm serverless instance in `/tmp/timetable.db`, making it ideal for live project demonstrations.
- **Session Secret:** Reads `SECRET_KEY` from environment variables (with a deterministic fallback for local/demo sessions).

---

## 4. Database Schema (`schema.sql`)
All foreign keys use `ON DELETE CASCADE` with `PRAGMA foreign_keys = ON;`:
1. `users` (`id`, `name`, `email`, `password_hash`, `role` [`admin` | `faculty`])
2. `faculty` (`id`, `user_id`, `department`, `designation`, `phone`)
3. `subjects` (`id`, `name`, `code`)
4. `groups` (`id`, `name`) — unified table for both School (`8-A`) and College (`BCA Sem 3 A`)
5. `rooms` (`id`, `name`, `capacity`)
6. `timeslots` (`id`, `label`, `start_time`, `end_time`)
7. `timetable` (`id`, `group_id`, `subject_id`, `faculty_id`, `room_id`, `day`, `timeslot_id`)
8. `faculty_subjects` (`faculty_id`, `subject_id`)
9. `settings` (`key`, `value`) — stores `institution_type` (`college` or `school`)

---

## 5. Clash Detection Logic (`detect_clash` in `app.py`)
Before inserting into `timetable`, `detect_clash()` checks three conditions for the target `(day, timeslot_id)` in order:
1. **Group Clash:** Does `group_id` already have a class scheduled in that `(day, timeslot_id)`?
2. **Faculty Clash:** Is `faculty_id` already teaching another group in that `(day, timeslot_id)`?
3. **Room Clash:** Is `room_id` already occupied by another group in that `(day, timeslot_id)`?

If any match is found, saving is blocked and a descriptive flash error naming the conflicting entity is shown.

---

## 6. Design System & UI Decisions
- **Palette (CSS Variables in `static/css/style.css`):**
  - `--primary`: `#2F5D8A`
  - `--primary-dark`: `#244A70`
  - `--accent`: `#E08E45`
  - `--bg`: `#F5F7FA`
  - `--surface`: `#FFFFFF`
  - `--text`: `#1F2A37`
  - `--muted`: `#6B7280`
  - `--border`: `#E5E7EB`
  - `--success`: `#3A9D6E`
  - `--danger`: `#D1495B`
- **Clean Institutional Aesthetic:** Crisp `1px` borders, subtle `4px`–`6px` radius, left-aligned login panel with top accent border, flat left-bar active sidebar links, deterministic soft pastel tints per subject (`.pastel-1` to `.pastel-8`), and `@media print` CSS for printing timetables.

---

## 7. Demo Credentials
- **Admin:** `admin` or `admin@campus.edu` / `admin123`
- **Faculty:** `ramesh.sharma@campus.edu` / `password123` (also `sunita.verma@campus.edu`, `ananya.iyer@campus.edu`, etc., all seeded with `password123`)

---

## 8. Local Scripts & Testing
- `python app.py` or `run.bat` — starts local server at `http://127.0.0.1:5000`
- `python seed.py` or `reset_db.bat` — resets and seeds demo data into `timetable.db`
- `python test_app.py` or `test.bat` — runs 7 unit/integration tests covering auth, roles, CRUD, settings toggle, and clash detection

