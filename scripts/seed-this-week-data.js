const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let env = '';
if (fs.existsSync('.env.local')) {
  env = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
  env = fs.readFileSync('.env', 'utf8');
}

const vars = Object.fromEntries(
  env
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function seedThisWeek() {
  console.log('--- Seeding Site Data for This Week (Nov 16 - Nov 21, 2026) ---');

  // 1. Fetch reference data
  const [resFaculty, resSubjects, resRooms, resSlots, resGroups] = await Promise.all([
    supabase.from('faculty').select('id, department, designation, users:user_id(name)'),
    supabase.from('subjects').select('*'),
    supabase.from('rooms').select('*'),
    supabase.from('timeslots').select('*').order('id'),
    supabase.from('groups').select('*').order('id'),
  ]);

  const faculty = resFaculty.data || [];
  const subjects = resSubjects.data || [];
  const rooms = resRooms.data || [];
  const timeslots = resSlots.data || [];
  const groups = resGroups.data || [];

  console.log(`Loaded ${faculty.length} faculty, ${subjects.length} subjects, ${rooms.length} rooms, ${timeslots.length} timeslots, ${groups.length} groups.`);

  // 2. Populate Faculty Attendance for the entire week
  console.log('Generating attendance records for Nov 16 to Nov 21, 2026...');
  const weekDates = [
    { date: '2026-11-16', label: 'Monday' },
    { date: '2026-11-17', label: 'Tuesday (Today)' },
    { date: '2026-11-18', label: 'Wednesday' },
    { date: '2026-11-19', label: 'Thursday' },
    { date: '2026-11-20', label: 'Friday' },
    { date: '2026-11-21', label: 'Saturday' },
  ];

  let attIdCounter = 1;
  const attendanceList = [];

  for (const dayObj of weekDates) {
    const d = dayObj.date;

    faculty.forEach((f, idx) => {
      const fName = f.users?.name || 'Faculty Member';
      let status = 'present';
      let checkIn = '08:45 AM';
      let remarks = 'On time';

      if (d === '2026-11-16') {
        // Monday
        if (f.id === 12) {
          status = 'on_leave';
          checkIn = undefined;
          remarks = 'Approved medical leave';
        } else if (f.id === 14) {
          status = 'late';
          checkIn = '09:20 AM';
          remarks = 'Transit delay';
        } else {
          checkIn = idx % 2 === 0 ? '08:45 AM' : '08:52 AM';
        }
      } else if (d === '2026-11-17') {
        // Tuesday (Today!)
        if (f.id === 11) {
          status = 'late';
          checkIn = '09:12 AM';
          remarks = 'Highway traffic congestion';
        } else if (f.id === 16) {
          status = 'present';
          checkIn = '08:40 AM';
          remarks = 'Early arrival - First period lecture';
        } else {
          checkIn = '08:50 AM';
          remarks = 'On time';
        }
      } else if (d === '2026-11-18') {
        // Wednesday
        if (f.id === 13) {
          status = 'on_leave';
          checkIn = undefined;
          remarks = 'Attending AI & Data Science Symposium';
        } else {
          checkIn = '08:48 AM';
          remarks = 'On time';
        }
      } else if (d === '2026-11-19') {
        // Thursday
        if (f.id === 10) {
          status = 'late';
          checkIn = '09:05 AM';
          remarks = 'Staff council coordination meeting';
        } else {
          checkIn = '08:50 AM';
          remarks = 'On time';
        }
      } else if (d === '2026-11-20') {
        // Friday
        if (f.id === 15) {
          status = 'on_leave';
          checkIn = undefined;
          remarks = 'Faculty development program';
        } else {
          checkIn = '08:45 AM';
          remarks = 'On time';
        }
      } else if (d === '2026-11-21') {
        // Saturday
        if (f.id === 12) {
          status = 'on_leave';
          checkIn = undefined;
          remarks = 'Weekend research sabbatical';
        } else {
          checkIn = '08:55 AM';
          remarks = 'Half-day schedule';
        }
      }

      attendanceList.push({
        id: attIdCounter++,
        faculty_id: f.id,
        date: d,
        status: status,
        check_in_time: checkIn,
        remarks: remarks,
        faculty_name: fName,
        department: f.department,
        designation: f.designation,
      });
    });
  }

  // Save to settings
  console.log(`Saving ${attendanceList.length} attendance records across the week...`);
  await supabase
    .from('settings')
    .upsert(
      { key: 'faculty_attendance', value: JSON.stringify(attendanceList) },
      { onConflict: 'key' }
    );
  console.log('Attendance successfully saved to database!');

  // 3. Clear and generate rich conflict-free timetable allocations for the week
  console.log('Re-building full conflict-free weekly timetable for all College and School cohorts...');

  // Maps for easy lookup
  const groupMap = Object.fromEntries(groups.map((g) => [g.name, g.id]));
  const subjectCodeMap = Object.fromEntries(subjects.map((s) => [s.code, s.id]));
  const facultyNameMap = Object.fromEntries(faculty.map((f) => [f.users?.name, f.id]));
  const roomNameMap = Object.fromEntries(rooms.map((r) => [r.name, r.id]));

  // Remove existing timetable entries to build clean, guaranteed clash-free weekly schedule
  await supabase.from('timetable').delete().neq('id', 0);

  const timetableEntries = [];

  // Helper to add slot
  const occupiedGroup = new Set();
  const occupiedFaculty = new Set();
  const occupiedRoom = new Set();

  function addClass(gName, subCode, fName, rName, day, periodNum) {
    const gId = groupMap[gName];
    const sId = subjectCodeMap[subCode];
    const fId = facultyNameMap[fName];
    const rId = roomNameMap[rName];
    const ts = timeslots[periodNum - 1];

    if (!gId || !sId || !fId || !rId || !ts) {
      console.warn(`Missing reference: g=${gName}(${gId}), s=${subCode}(${sId}), f=${fName}(${fId}), r=${rName}(${rId}), ts=${periodNum}`);
      return;
    }

    const gKey = `${gId}-${day}-${ts.id}`;
    const fKey = `${fId}-${day}-${ts.id}`;
    const rKey = `${rId}-${day}-${ts.id}`;

    if (occupiedGroup.has(gKey)) {
      console.error(`Group collision: ${gName} on ${day} Period ${periodNum}`);
      return;
    }
    if (occupiedFaculty.has(fKey)) {
      console.error(`Faculty collision: ${fName} on ${day} Period ${periodNum}`);
      return;
    }
    if (occupiedRoom.has(rKey)) {
      console.error(`Room collision: ${rName} on ${day} Period ${periodNum}`);
      return;
    }

    occupiedGroup.add(gKey);
    occupiedFaculty.add(fKey);
    occupiedRoom.add(rKey);

    timetableEntries.push({
      group_id: gId,
      subject_id: sId,
      faculty_id: fId,
      room_id: rId,
      day: day,
      timeslot_id: ts.id,
    });
  }

  // --- COLLEGE MODE SCHEDULE ---
  // Rooms: Room 101 (1), Room 102 (2), Lab 204 (3), Lab 205 (4), Seminar Hall 1 (5)
  // Faculty:
  // Dr. Ramesh Sharma (9) - CS301 (DSA)
  // Prof. Sunita Verma (10) - MA201 (Discrete Math)
  // Dr. Rajesh Kulkarni (11) - CS401 (Computer Networks)
  // Prof. Ananya Iyer (12) - CS302 (DBMS)
  // Dr. Amit Joshi (13) - CS303 (Operating Systems)
  // Prof. Priya Nair (14) - CS302 (DBMS)
  // Dr. Vikram Deshmukh (15) - CS301 / CS401
  // Prof. Neha Gupta (16) - HU101 (Ethics)

  const collegeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // MONDAY (College)
  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Monday', 1);
  addClass('BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Monday', 1);
  addClass('B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Monday', 1);
  addClass('B.Tech IT Sem 5 A', 'CS302', 'Prof. Priya Nair', 'Lab 204 (Computing Lab 1)', 'Monday', 1);

  addClass('BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Monday', 2);
  addClass('BCA Sem 3 B', 'CS302', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Monday', 2);
  addClass('B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Monday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS401', 'Dr. Vikram Deshmukh', 'Seminar Hall 1', 'Monday', 2);

  addClass('BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Monday', 3);
  addClass('BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Monday', 3);
  addClass('B.Tech CSE Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Seminar Hall 1', 'Monday', 3);
  addClass('B.Tech IT Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Monday', 3);

  addClass('BCA Sem 3 A', 'HU101', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Monday', 4);
  addClass('BCA Sem 3 B', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 102 (Lecture Hall B)', 'Monday', 4);
  addClass('B.Tech CSE Sem 5 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Monday', 4);
  addClass('B.Tech IT Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Monday', 4);

  addClass('BCA Sem 3 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Monday', 5);
  addClass('B.Tech CSE Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Monday', 5);

  // TUESDAY (TODAY! - Rich schedule)
  addClass('BCA Sem 3 A', 'CS303', 'Dr. Amit Joshi', 'Room 101 (Lecture Hall A)', 'Tuesday', 1);
  addClass('BCA Sem 3 B', 'CS301', 'Dr. Ramesh Sharma', 'Room 102 (Lecture Hall B)', 'Tuesday', 1);
  addClass('B.Tech CSE Sem 5 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Tuesday', 1);
  addClass('B.Tech IT Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Tuesday', 1);

  addClass('BCA Sem 3 A', 'CS302', 'Prof. Priya Nair', 'Room 101 (Lecture Hall A)', 'Tuesday', 2);
  addClass('BCA Sem 3 B', 'CS303', 'Dr. Amit Joshi', 'Room 102 (Lecture Hall B)', 'Tuesday', 2);
  addClass('B.Tech CSE Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Tuesday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS301', 'Dr. Vikram Deshmukh', 'Lab 205 (Computing Lab 2)', 'Tuesday', 2);

  addClass('BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Tuesday', 3);
  addClass('BCA Sem 3 B', 'HU101', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Tuesday', 3);
  addClass('B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Seminar Hall 1', 'Tuesday', 3);
  addClass('B.Tech IT Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Lab 204 (Computing Lab 1)', 'Tuesday', 3);

  addClass('BCA Sem 3 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Tuesday', 4);
  addClass('BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Tuesday', 4);
  addClass('B.Tech CSE Sem 5 A', 'CS401', 'Dr. Vikram Deshmukh', 'Seminar Hall 1', 'Tuesday', 4);
  addClass('B.Tech IT Sem 5 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Tuesday', 4);

  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Lab 205 (Computing Lab 2)', 'Tuesday', 5);
  addClass('B.Tech IT Sem 5 A', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Tuesday', 5);

  // WEDNESDAY (College)
  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Wednesday', 1);
  addClass('BCA Sem 3 B', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 102 (Lecture Hall B)', 'Wednesday', 1);
  addClass('B.Tech CSE Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Wednesday', 1);
  addClass('B.Tech IT Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Lab 204 (Computing Lab 1)', 'Wednesday', 1);

  addClass('BCA Sem 3 A', 'CS303', 'Dr. Amit Joshi', 'Room 101 (Lecture Hall A)', 'Wednesday', 2);
  addClass('BCA Sem 3 B', 'CS302', 'Prof. Ananya Iyer', 'Room 102 (Lecture Hall B)', 'Wednesday', 2);
  addClass('B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Wednesday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS301', 'Dr. Vikram Deshmukh', 'Lab 205 (Computing Lab 2)', 'Wednesday', 2);

  addClass('BCA Sem 3 A', 'HU101', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Wednesday', 3);
  addClass('BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Wednesday', 3);
  addClass('B.Tech CSE Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Seminar Hall 1', 'Wednesday', 3);
  addClass('B.Tech IT Sem 5 A', 'CS302', 'Prof. Priya Nair', 'Lab 204 (Computing Lab 1)', 'Wednesday', 3);

  addClass('BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Wednesday', 4);
  addClass('B.Tech CSE Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Wednesday', 4);
  addClass('B.Tech IT Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Wednesday', 4);

  // THURSDAY (College)
  addClass('BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Thursday', 1);
  addClass('BCA Sem 3 B', 'CS303', 'Dr. Amit Joshi', 'Room 102 (Lecture Hall B)', 'Thursday', 1);
  addClass('B.Tech CSE Sem 5 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Thursday', 1);
  addClass('B.Tech IT Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Thursday', 1);

  addClass('BCA Sem 3 A', 'CS302', 'Prof. Priya Nair', 'Room 101 (Lecture Hall A)', 'Thursday', 2);
  addClass('BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Thursday', 2);
  addClass('B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Thursday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Lab 205 (Computing Lab 2)', 'Thursday', 2);

  addClass('BCA Sem 3 A', 'CS303', 'Dr. Amit Joshi', 'Room 101 (Lecture Hall A)', 'Thursday', 3);
  addClass('BCA Sem 3 B', 'HU101', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Thursday', 3);
  addClass('B.Tech CSE Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Seminar Hall 1', 'Thursday', 3);
  addClass('B.Tech IT Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Lab 204 (Computing Lab 1)', 'Thursday', 3);

  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Thursday', 4);
  addClass('B.Tech CSE Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Thursday', 4);
  addClass('B.Tech IT Sem 5 A', 'CS302', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Thursday', 4);

  // FRIDAY (College)
  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Friday', 1);
  addClass('BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Friday', 1);
  addClass('B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Friday', 1);
  addClass('B.Tech IT Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Friday', 1);

  addClass('BCA Sem 3 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Friday', 2);
  addClass('BCA Sem 3 B', 'CS302', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Friday', 2);
  addClass('B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Seminar Hall 1', 'Friday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS301', 'Dr. Vikram Deshmukh', 'Lab 204 (Computing Lab 1)', 'Friday', 2);

  addClass('BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Friday', 3);
  addClass('BCA Sem 3 B', 'HU101', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Friday', 3);
  addClass('B.Tech CSE Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Friday', 3);
  addClass('B.Tech IT Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Friday', 4);

  // SATURDAY (College - Half day)
  addClass('BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Saturday', 1);
  addClass('BCA Sem 3 B', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 102 (Lecture Hall B)', 'Saturday', 1);
  addClass('B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Seminar Hall 1', 'Saturday', 1);
  addClass('B.Tech IT Sem 5 A', 'MA201', 'Prof. Sunita Verma', 'Lab 204 (Computing Lab 1)', 'Saturday', 1);

  addClass('BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Saturday', 2);
  addClass('BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Saturday', 2);
  addClass('B.Tech CSE Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Saturday', 2);
  addClass('B.Tech IT Sem 5 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 205 (Computing Lab 2)', 'Saturday', 2);

  // --- SCHOOL MODE SCHEDULE ---
  // School classes 1 to 12
  // We schedule school classes into rooms without clashing with each other.
  // We use afternoon timeslots or distinct rooms / distinct periods.
  // Or since School and College operate as distinct institutional models in the app:
  // Primary: Class 1, 2, 3, 4, 5
  // Middle: Class 6-A, 7-A, 8-A
  // Secondary: Class 9-A, 10-A
  // Senior Sec: Class 11-A, 11-B, 12-A, 12-B

  // Class 1
  addClass('Class 1', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Monday', 6);
  addClass('Class 1', 'SCI-PRI', 'Prof. Priya Nair', 'Room 101 (Lecture Hall A)', 'Tuesday', 6);
  addClass('Class 1', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Wednesday', 5);
  addClass('Class 1', 'HIN-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Thursday', 5);
  addClass('Class 1', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 204 (Computing Lab 1)', 'Friday', 5);

  // Class 2
  addClass('Class 2', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Monday', 6);
  addClass('Class 2', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Tuesday', 6);
  addClass('Class 2', 'SCI-PRI', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Wednesday', 5);
  addClass('Class 2', 'HIN-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Thursday', 6);
  addClass('Class 2', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Friday', 6);

  // Class 3
  addClass('Class 3', 'SCI-PRI', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Monday', 6);
  addClass('Class 3', 'MATH-SEC', 'Prof. Sunita Verma', 'Lab 205 (Computing Lab 2)', 'Tuesday', 6);
  addClass('Class 3', 'ENG-ALL', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Wednesday', 6);
  addClass('Class 3', 'COMP-SEC', 'Dr. Rajesh Kulkarni', 'Lab 205 (Computing Lab 2)', 'Thursday', 6);

  // Class 4
  addClass('Class 4', 'MATH-SEC', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Monday', 6);
  addClass('Class 4', 'ENG-ALL', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Tuesday', 6);
  addClass('Class 4', 'HIN-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Friday', 6);

  // Class 5
  addClass('Class 5', 'SCI-PRI', 'Prof. Priya Nair', 'Lab 204 (Computing Lab 1)', 'Monday', 7);
  addClass('Class 5', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Tuesday', 7);
  addClass('Class 5', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Wednesday', 6);

  // Class 6-A
  addClass('Class 6-A', 'SST-MID', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Monday', 7);
  addClass('Class 6-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Tuesday', 7);
  addClass('Class 6-A', 'SCI-PRI', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Thursday', 5);
  addClass('Class 6-A', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Friday', 5);

  // Class 7-A
  addClass('Class 7-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Lab 205 (Computing Lab 2)', 'Monday', 7);
  addClass('Class 7-A', 'SST-MID', 'Prof. Neha Gupta', 'Lab 204 (Computing Lab 1)', 'Wednesday', 7);
  addClass('Class 7-A', 'COMP-SEC', 'Dr. Rajesh Kulkarni', 'Lab 204 (Computing Lab 1)', 'Friday', 7);

  // Class 8-A
  addClass('Class 8-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Tuesday', 7);
  addClass('Class 8-A', 'SCI-PRI', 'Prof. Priya Nair', 'Room 101 (Lecture Hall A)', 'Wednesday', 7);
  addClass('Class 8-A', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Thursday', 7);

  // Class 9-A
  addClass('Class 9-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Monday', 5);
  addClass('Class 9-A', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Tuesday', 5);
  addClass('Class 9-A', 'CHEM-SR', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Wednesday', 6);
  addClass('Class 9-A', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Saturday', 3);

  // Class 10-A
  addClass('Class 10-A', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Monday', 6);
  addClass('Class 10-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Wednesday', 5);
  addClass('Class 10-A', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Thursday', 6);
  addClass('Class 10-A', 'BIO-SR', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Friday', 6);
  addClass('Class 10-A', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Saturday', 3);

  // Class 11-A (Science)
  addClass('Class 11-A (Science)', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Monday', 7);
  addClass('Class 11-A (Science)', 'CHEM-SR', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Tuesday', 7);
  addClass('Class 11-A (Science)', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Wednesday', 7);
  addClass('Class 11-A (Science)', 'BIO-SR', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Thursday', 7);

  // Class 11-B (Commerce)
  addClass('Class 11-B (Commerce)', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Thursday', 7);
  addClass('Class 11-B (Commerce)', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Friday', 7);
  addClass('Class 11-B (Commerce)', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Saturday', 3);

  // Class 12-A (Science)
  addClass('Class 12-A (Science)', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Lab 205 (Computing Lab 2)', 'Monday', 5);
  addClass('Class 12-A (Science)', 'CHEM-SR', 'Prof. Ananya Iyer', 'Room 101 (Lecture Hall A)', 'Wednesday', 6);
  addClass('Class 12-A (Science)', 'MATH-SEC', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Thursday', 6);
  addClass('Class 12-A (Science)', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Friday', 7);

  // Class 12-B (Commerce)
  addClass('Class 12-B (Commerce)', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Tuesday', 5);
  addClass('Class 12-B (Commerce)', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Friday', 5);
  addClass('Class 12-B (Commerce)', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Saturday', 4);

  console.log(`Inserting ${timetableEntries.length} conflict-free timetable entries into database...`);

  // Batch insert in chunks of 50
  for (let i = 0; i < timetableEntries.length; i += 50) {
    const chunk = timetableEntries.slice(i, i + 50);
    const { error: insErr } = await supabase.from('timetable').insert(chunk);
    if (insErr) {
      console.error('Error inserting timetable chunk:', insErr);
      process.exit(1);
    }
  }

  console.log('--- Successfully seeded rich timetable & attendance for this week! ---');
}

seedThisWeek().catch(console.error);
