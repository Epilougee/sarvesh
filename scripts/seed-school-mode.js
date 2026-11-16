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

async function seedSchoolData() {
  console.log('Seeding School Classes (1 to 12)...');
  const schoolClasses = [
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6-A',
    'Class 7-A',
    'Class 8-A',
    'Class 9-A',
    'Class 10-A',
    'Class 11-A (Science)',
    'Class 11-B (Commerce)',
    'Class 12-A (Science)',
    'Class 12-B (Commerce)',
  ];

  for (const c of schoolClasses) {
    await supabase.from('groups').upsert({ name: c }, { onConflict: 'name' });
  }

  console.log('Seeding School Subjects...');
  const schoolSubjects = [
    { name: 'Mathematics', code: 'MATH-SEC' },
    { name: 'General Science & EVS', code: 'SCI-PRI' },
    { name: 'Physics', code: 'PHY-SR' },
    { name: 'Chemistry', code: 'CHEM-SR' },
    { name: 'Biology', code: 'BIO-SR' },
    { name: 'English Literature', code: 'ENG-ALL' },
    { name: 'Social Studies & History', code: 'SST-MID' },
    { name: 'Computer Applications', code: 'COMP-SEC' },
    { name: 'Hindi Language', code: 'HIN-ALL' },
  ];

  for (const s of schoolSubjects) {
    await supabase.from('subjects').upsert(s, { onConflict: 'code' });
  }

  // Get IDs
  const { data: dbGroups } = await supabase.from('groups').select('*');
  const groupMap = Object.fromEntries((dbGroups || []).map((g) => [g.name, g.id]));

  const { data: dbSubjects } = await supabase.from('subjects').select('*');
  const subjectMap = Object.fromEntries((dbSubjects || []).map((s) => [s.code, s.id]));

  const { data: dbFaculty } = await supabase.from('faculty').select('id, users:user_id (name)');
  const facultyMap = Object.fromEntries((dbFaculty || []).map((f) => [f.users?.name, f.id]));

  const { data: dbRooms } = await supabase.from('rooms').select('*');
  const roomMap = Object.fromEntries((dbRooms || []).map((r) => [r.name, r.id]));

  const { data: dbSlots } = await supabase.from('timeslots').select('*').order('id');

  console.log('Seeding School Timetable schedule entries...');
  const schoolSchedule = [
    // Class 10-A
    ['Class 10-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Monday', 0],
    ['Class 10-A', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Monday', 1],
    ['Class 10-A', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Monday', 2],
    ['Class 10-A', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Monday', 3],
    ['Class 10-A', 'CHEM-SR', 'Prof. Ananya Iyer', 'Room 101 (Lecture Hall A)', 'Tuesday', 0],
    ['Class 10-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Tuesday', 1],
    ['Class 10-A', 'SST-MID', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Tuesday', 2],
    ['Class 10-A', 'BIO-SR', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Wednesday', 1],
    ['Class 10-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Thursday', 0],
    ['Class 10-A', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Friday', 1],

    // Class 12-A (Science)
    ['Class 12-A (Science)', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Room 102 (Lecture Hall B)', 'Monday', 0],
    ['Class 12-A (Science)', 'CHEM-SR', 'Prof. Ananya Iyer', 'Room 102 (Lecture Hall B)', 'Monday', 1],
    ['Class 12-A (Science)', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Monday', 2],
    ['Class 12-A (Science)', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Tuesday', 1],
    ['Class 12-A (Science)', 'BIO-SR', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Wednesday', 2],
    ['Class 12-A (Science)', 'PHY-SR', 'Dr. Rajesh Kulkarni', 'Room 102 (Lecture Hall B)', 'Thursday', 1],
    ['Class 12-A (Science)', 'ENG-ALL', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Friday', 2],

    // Class 9-A
    ['Class 9-A', 'ENG-ALL', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Monday', 1],
    ['Class 9-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Seminar Hall 1', 'Monday', 2],
    ['Class 9-A', 'SCI-PRI', 'Prof. Priya Nair', 'Seminar Hall 1', 'Tuesday', 0],
    ['Class 9-A', 'SST-MID', 'Prof. Neha Gupta', 'Seminar Hall 1', 'Thursday', 2],
    ['Class 9-A', 'COMP-SEC', 'Dr. Ramesh Sharma', 'Lab 204 (Computing Lab 1)', 'Saturday', 0],

    // Class 6-A
    ['Class 6-A', 'SCI-PRI', 'Prof. Priya Nair', 'Room 101 (Lecture Hall A)', 'Monday', 4],
    ['Class 6-A', 'HIN-ALL', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Tuesday', 3],
    ['Class 6-A', 'MATH-SEC', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Wednesday', 0],
    ['Class 6-A', 'COMP-SEC', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Friday', 3],
  ];

  let added = 0;
  for (const [gName, sCode, fName, rName, day, slotIdx] of schoolSchedule) {
    const gId = groupMap[gName];
    const sId = subjectMap[sCode];
    const fId = facultyMap[fName];
    const rId = roomMap[rName];
    const ts = dbSlots[slotIdx];

    if (gId && sId && fId && rId && ts) {
      await supabase.from('timetable').insert({
        group_id: gId,
        subject_id: sId,
        faculty_id: fId,
        room_id: rId,
        day,
        timeslot_id: ts.id,
      });
      added++;
    }
  }

  console.log('Seeded ' + schoolClasses.length + ' classes, ' + schoolSubjects.length + ' subjects, and ' + added + ' slots.');

  // Also seed initial faculty attendance for today
  console.log('Seeding initial faculty attendance...');
  const today = new Date().toISOString().split('T')[0];
  const sampleAttendance = (dbFaculty || []).map((f, idx) => {
    // 7 present, 1 on leave
    const isOnLeave = idx === 3; // Prof. Ananya Iyer on leave
    const isLate = idx === 5; // Prof. Priya Nair late
    const status = isOnLeave ? 'on_leave' : isLate ? 'late' : 'present';
    return {
      id: idx + 1,
      faculty_id: f.id,
      date: today,
      status: status,
      check_in_time: isOnLeave ? null : isLate ? '09:20 AM' : '08:50 AM',
      remarks: isOnLeave ? 'Academic Seminar leave' : isLate ? 'Transit delay' : 'On time',
    };
  });

  await supabase.from('settings').upsert({
    key: 'faculty_attendance',
    value: JSON.stringify(sampleAttendance),
  });
  console.log('Seeded initial faculty attendance for ' + today);
}

seedSchoolData().catch(console.error);
