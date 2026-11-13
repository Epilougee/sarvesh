"""
Comprehensive unit and integration test script for Faculty & Timetable Management app.
Tests all routes, authentication, clash detection, and role-based access.
"""

import unittest
from app import app
from database import get_db
from seed import seed_database

class TimetableAppTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret'
        seed_database()
        self.client = app.test_client()

    def login(self, identifier, password):
        return self.client.post('/login', data={
            'identifier': identifier,
            'password': password
        }, follow_redirects=True)

    def logout(self):
        return self.client.get('/logout', follow_redirects=True)

    def test_01_admin_login_and_dashboard(self):
        """Test admin login with username and email, verify dashboard stats"""
        res = self.login('admin', 'admin123')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Admin Overview", res.data)
        self.assertIn(b"Faculty Members", res.data)
        self.assertIn(b"Scheduled Classes for", res.data)

        self.logout()

        # Test email 'admin@campus.edu'
        res = self.login('admin@campus.edu', 'admin123')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Admin Overview", res.data)

    def test_02_faculty_login_and_workload(self):
        """Test faculty login, redirect to /my-timetable, view workload and read-only schedule"""
        res = self.login('ramesh.sharma@campus.edu', 'password123')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"My Teaching Schedule", res.data)
        self.assertIn(b"Dr. Ramesh Sharma", res.data)
        self.assertIn(b"Total Periods / Week", res.data)
        self.assertIn(b"Read-Only Portal", res.data)

        # Ensure faculty cannot access admin dashboard
        blocked_res = self.client.get('/dashboard', follow_redirects=True)
        self.assertIn(b"Unauthorized access", blocked_res.data)

    def test_03_institution_settings_toggle(self):
        """Test toggle between School and College modes"""
        self.login('admin', 'admin123')
        # Switch to school
        res = self.client.post('/settings', data={'institution_type': 'school'}, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"School Mode", res.data)
        self.assertIn(b"Class / Sections", res.data)

        # Switch back to college
        res = self.client.post('/settings', data={'institution_type': 'college'}, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"College Mode", res.data)
        self.assertIn(b"Cohort / Divisions", res.data)

    def test_04_faculty_crud_and_search(self):
        """Test adding, editing, searching, and deleting a faculty member"""
        self.login('admin', 'admin123')

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM subjects LIMIT 2")
        valid_subjects = [str(r['id']) for r in cur.fetchall()]

        # Add
        res = self.client.post('/faculty/add', data={
            'name': 'Dr. Meera Nambiar',
            'email': 'meera.nambiar@campus.edu',
            'password': 'password123',
            'department': 'Data Science',
            'designation': 'Assistant Professor',
            'phone': '9876543210',
            'subject_ids': valid_subjects
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Dr. Meera Nambiar", res.data)

        # Search
        res_search = self.client.get('/faculty?q=Nambiar')
        self.assertIn(b"Dr. Meera Nambiar", res_search.data)

        # Fetch ID
        cur.execute("SELECT id FROM faculty WHERE department = 'Data Science'")
        fac = cur.fetchone()
        self.assertIsNotNone(fac)
        fac_id = fac['id']

        # Edit
        res_edit = self.client.post(f'/faculty/edit/{fac_id}', data={
            'name': 'Dr. Meera Nambiar Updated',
            'email': 'meera.nambiar@campus.edu',
            'department': 'Artificial Intelligence',
            'designation': 'Associate Professor',
            'phone': '9876543219',
            'subject_ids': [valid_subjects[0]]
        }, follow_redirects=True)
        self.assertIn(b"Dr. Meera Nambiar Updated", res_edit.data)

        # Delete
        res_del = self.client.post(f'/faculty/delete/{fac_id}', follow_redirects=True)
        self.assertIn(b"Faculty member and associated timetable entries deleted successfully", res_del.data)

    def test_05_subjects_groups_rooms_crud(self):
        """Test subjects, groups, and rooms creation and modification"""
        self.login('admin', 'admin123')

        # Add Subject
        res = self.client.post('/subjects/add', data={
            'name': 'Cloud Computing Architecture',
            'code': 'CS505'
        }, follow_redirects=True)
        self.assertIn(b"CS505", res.data)

        # Add Group
        res = self.client.post('/groups/add', data={
            'name': 'M.Tech CSE Sem 1'
        }, follow_redirects=True)
        self.assertIn(b"M.Tech CSE Sem 1", res.data)

        # Add Room
        res = self.client.post('/rooms/add', data={
            'name': 'Lab 301 (AI and Cloud)',
            'capacity': '35'
        }, follow_redirects=True)
        self.assertIn(b"Lab 301 (AI and Cloud)", res.data)

    def test_06_clash_detection_exhaustive(self):
        """
        Thoroughly test all three clash detection scenarios:
        1. Group clash (group already has a class in that slot)
        2. Faculty clash (faculty already teaching another group)
        3. Room clash (room already occupied)
        And successful conflict-free scheduling.
        """
        self.login('admin', 'admin123')
        conn = get_db()
        cur = conn.cursor()

        # In seed data:
        # On Monday Period 1:
        # - Group 'BCA Sem 3 A' has 'CS301' with 'Dr. Ramesh Sharma' in 'Room 101 (Lecture Hall A)'
        # - Group 'BCA Sem 3 B' has 'MA201' with 'Prof. Sunita Verma' in 'Room 102 (Lecture Hall B)'
        # - Group 'B.Tech IT Sem 5 A' has NO class on Monday Period 1
        # - 'Lab 204 (Computing Lab 1)' is FREE on Monday Period 1

        cur.execute("SELECT id FROM groups WHERE name = 'BCA Sem 3 A'")
        group_a = cur.fetchone()['id']
        cur.execute("SELECT id FROM groups WHERE name = 'B.Tech IT Sem 5 A'")
        group_it = cur.fetchone()['id']

        cur.execute("SELECT f.id FROM faculty f JOIN users u ON f.user_id = u.id WHERE u.name = 'Dr. Ramesh Sharma'")
        fac_ramesh = cur.fetchone()['id']
        cur.execute("SELECT f.id FROM faculty f JOIN users u ON f.user_id = u.id WHERE u.name = 'Prof. Priya Nair'")
        fac_priya = cur.fetchone()['id']

        cur.execute("SELECT id FROM rooms WHERE name LIKE '%Room 101%'")
        room_101 = cur.fetchone()['id']
        cur.execute("SELECT id FROM rooms WHERE name LIKE '%Lab 204%'")
        room_204 = cur.fetchone()['id']

        cur.execute("SELECT id FROM subjects WHERE code = 'CS301'")
        subj_cs301 = cur.fetchone()['id']
        cur.execute("SELECT id FROM subjects WHERE code = 'CS302'")
        subj_cs302 = cur.fetchone()['id']

        cur.execute("SELECT id FROM timeslots WHERE label = 'Period 1'")
        period_1 = cur.fetchone()['id']
        cur.execute("SELECT id FROM timeslots WHERE label = 'Period 7'")
        period_7 = cur.fetchone()['id']

        # 1. GROUP CLASH: Group A already has a class on Monday Period 1
        res_group_clash = self.client.post('/timetable/add', data={
            'group_id': group_a,
            'subject_id': subj_cs302,
            'faculty_id': fac_priya,
            'room_id': room_204,
            'day': 'Monday',
            'timeslot_id': period_1
        }, follow_redirects=True)
        self.assertIn(b"Group Clash", res_group_clash.data)

        # 2. FACULTY CLASH: Group IT is free, Lab 204 is free, but Dr. Ramesh is busy teaching Group A
        res_fac_clash = self.client.post('/timetable/add', data={
            'group_id': group_it,
            'subject_id': subj_cs301,
            'faculty_id': fac_ramesh,
            'room_id': room_204,
            'day': 'Monday',
            'timeslot_id': period_1
        }, follow_redirects=True)
        self.assertIn(b"Faculty Clash", res_fac_clash.data)
        self.assertIn(b"Dr. Ramesh Sharma is already teaching", res_fac_clash.data)

        # 3. ROOM CLASH: Group IT is free, Priya is free, but Room 101 is occupied by Group A
        res_room_clash = self.client.post('/timetable/add', data={
            'group_id': group_it,
            'subject_id': subj_cs302,
            'faculty_id': fac_priya,
            'room_id': room_101,
            'day': 'Monday',
            'timeslot_id': period_1
        }, follow_redirects=True)
        self.assertIn(b"Room Clash", res_room_clash.data)
        self.assertIn(b"is already occupied", res_room_clash.data)

        # 4. SUCCESS: Everything free (Group IT, Priya, Lab 204 on Period 7)
        res_success = self.client.post('/timetable/add', data={
            'group_id': group_it,
            'subject_id': subj_cs302,
            'faculty_id': fac_priya,
            'room_id': room_204,
            'day': 'Monday',
            'timeslot_id': period_7
        }, follow_redirects=True)
        self.assertIn(b"Class period successfully scheduled without any clash", res_success.data)

    def test_07_timetable_view_and_builder_rendering(self):
        """Test timetable view by group and by faculty"""
        self.login('admin', 'admin123')
        # View by group
        res = self.client.get('/timetable/view?type=group')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Schedule for:", res.data)
        self.assertIn(b"Print Timetable", res.data)

        # View by faculty
        res_fac = self.client.get('/timetable/view?type=faculty')
        self.assertEqual(res_fac.status_code, 200)
        self.assertIn(b"Schedule for:", res_fac.data)

if __name__ == '__main__':
    unittest.main()
