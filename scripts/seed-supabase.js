const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
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

const supabaseUrl = vars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = vars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function seed() {
  console.log('Seeding Supabase database...');

  // 1. Settings
  await supabase
    .from('settings')
    .upsert({ key: 'institution_type', value: 'college' }, { onConflict: 'key' });

  // 2. Clear old data cleanly
  console.log('Cleaning timetable, faculty_subjects, faculty, and users...');
  await supabase.from('timetable').delete().neq('id', 0);
  await supabase.from('faculty_subjects').delete().neq('faculty_id', 0);
  await supabase.from('faculty').delete().neq('id', 0);
  await supabase.from('users').delete().neq('id', 0);

  // 3. Insert Admin user
  const adminHash = bcrypt.hashSync('admin123', 10);
  const { data: adminUser, error: adminErr } = await supabase
    .from('users')
    .insert({
      name: 'Dr. Arvind Menon (Admin)',
      email: 'admin@campus.edu',
      password_hash: adminHash,
      role: 'admin',
    })
    .select()
    .single();

  if (adminErr) {
    console.error('Failed to create admin:', adminErr);
    process.exit(1);
  }
  console.log('Admin user created successfully:', adminUser.email);

  // 4. Faculty list
  const facultyList = [
    { name: 'Dr. Ramesh Sharma', email: 'ramesh.sharma@campus.edu', dept: 'Computer Science', desig: 'Professor', phone: '9823011223' },
    { name: 'Prof. Sunita Verma', email: 'sunita.verma@campus.edu', dept: 'Mathematics', desig: 'Associate Professor', phone: '9823011224' },
    { name: 'Dr. Rajesh Kulkarni', email: 'rajesh.kulkarni@campus.edu', dept: 'Electronics & Comm', desig: 'Associate Professor', phone: '9823011225' },
    { name: 'Prof. Ananya Iyer', email: 'ananya.iyer@campus.edu', dept: 'Computer Science', desig: 'Assistant Professor', phone: '9823011226' },
    { name: 'Dr. Amit Joshi', email: 'amit.joshi@campus.edu', dept: 'Computer Science', desig: 'Assistant Professor', phone: '9823011227' },
    { name: 'Prof. Priya Nair', email: 'priya.nair@campus.edu', dept: 'Information Technology', desig: 'Assistant Professor', phone: '9823011228' },
    { name: 'Dr. Vikram Deshmukh', email: 'vikram.deshmukh@campus.edu', dept: 'Information Technology', desig: 'Professor', phone: '9823011229' },
    { name: 'Prof. Neha Gupta', email: 'neha.gupta@campus.edu', dept: 'Humanities & Management', desig: 'Lecturer', phone: '9823011230' },
  ];

  const facultyPassHash = bcrypt.hashSync('password123', 10);
  const facultyMap = {};

  for (const f of facultyList) {
    const { data: u, error: uErr } = await supabase
      .from('users')
      .insert({
        name: f.name,
        email: f.email,
        password_hash: facultyPassHash,
        role: 'faculty',
      })
      .select()
      .single();

    if (uErr) {
      console.error('Error inserting user', f.email, uErr);
      continue;
    }

    const { data: fac, error: fErr } = await supabase
      .from('faculty')
      .insert({
        user_id: u.id,
        department: f.dept,
        designation: f.desig,
        phone: f.phone,
      })
      .select()
      .single();

    if (fErr) {
      console.error('Error inserting faculty', f.name, fErr);
      continue;
    }

    facultyMap[f.name] = fac.id;
  }
  console.log(`Created ${Object.keys(facultyMap).length} faculty profiles.`);

  // 5. Subjects
  const subjectsData = [
    { name: 'Data Structures & Algorithms', code: 'CS301' },
    { name: 'Database Management Systems', code: 'CS302' },
    { name: 'Discrete Mathematics', code: 'MA201' },
    { name: 'Computer Networks', code: 'CS401' },
    { name: 'Operating Systems', code: 'CS303' },
    { name: 'Professional Ethics & Communication', code: 'HU101' },
  ];
  for (const s of subjectsData) {
    await supabase.from('subjects').upsert(s, { onConflict: 'code' });
  }
  const { data: dbSubjects } = await supabase.from('subjects').select('*');
  const subjectMap = Object.fromEntries((dbSubjects || []).map((s) => [s.code, s.id]));

  // 6. Groups
  const groupsData = [
    { name: 'BCA Sem 3 A' },
    { name: 'BCA Sem 3 B' },
    { name: 'B.Tech CSE Sem 5 A' },
    { name: 'B.Tech IT Sem 5 A' },
  ];
  for (const g of groupsData) {
    await supabase.from('groups').upsert(g, { onConflict: 'name' });
  }
  const { data: dbGroups } = await supabase.from('groups').select('*');
  const groupMap = Object.fromEntries((dbGroups || []).map((g) => [g.name, g.id]));

  // 7. Rooms
  const roomsData = [
    { name: 'Room 101 (Lecture Hall A)', capacity: 60 },
    { name: 'Room 102 (Lecture Hall B)', capacity: 60 },
    { name: 'Lab 204 (Computing Lab 1)', capacity: 40 },
    { name: 'Lab 205 (Computing Lab 2)', capacity: 40 },
    { name: 'Seminar Hall 1', capacity: 120 },
  ];
  for (const r of roomsData) {
    await supabase.from('rooms').upsert(r, { onConflict: 'name' });
  }
  const { data: dbRooms } = await supabase.from('rooms').select('*');
  const roomMap = Object.fromEntries((dbRooms || []).map((r) => [r.name, r.id]));

  // 8. Timeslots
  const timeslotsData = [
    { label: 'Period 1', start_time: '09:00', end_time: '09:50' },
    { label: 'Period 2', start_time: '09:55', end_time: '10:45' },
    { label: 'Period 3', start_time: '10:50', end_time: '11:40' },
    { label: 'Period 4', start_time: '11:45', end_time: '12:35' },
    { label: 'Period 5', start_time: '01:25', end_time: '02:15' },
    { label: 'Period 6', start_time: '02:20', end_time: '03:10' },
    { label: 'Period 7', start_time: '03:15', end_time: '04:05' },
  ];
  const { data: existingSlots } = await supabase.from('timeslots').select('*').order('id');
  let slotList = existingSlots || [];
  if (slotList.length < 7) {
    for (const ts of timeslotsData) {
      await supabase.from('timeslots').insert(ts);
    }
    const { data: reSlots } = await supabase.from('timeslots').select('*').order('id');
    slotList = reSlots || [];
  }

  // 9. Faculty Subject qualifications
  const facultySubjMap = [
    { name: 'Dr. Ramesh Sharma', codes: ['CS301', 'CS303'] },
    { name: 'Prof. Sunita Verma', codes: ['MA201'] },
    { name: 'Dr. Rajesh Kulkarni', codes: ['CS401'] },
    { name: 'Prof. Ananya Iyer', codes: ['CS302', 'CS301'] },
    { name: 'Dr. Amit Joshi', codes: ['CS303', 'CS401'] },
    { name: 'Prof. Priya Nair', codes: ['CS302', 'CS401'] },
    { name: 'Dr. Vikram Deshmukh', codes: ['CS301', 'CS302'] },
    { name: 'Prof. Neha Gupta', codes: ['HU101'] },
  ];
  for (const item of facultySubjMap) {
    const fId = facultyMap[item.name];
    if (!fId) continue;
    for (const code of item.codes) {
      const sId = subjectMap[code];
      if (sId) {
        await supabase.from('faculty_subjects').upsert({ faculty_id: fId, subject_id: sId });
      }
    }
  }

  // 10. Sample timetable schedule (Monday to Saturday)
  const scheduleEntries = [
    // Monday
    ['BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Monday', 0],
    ['BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Monday', 1],
    ['BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Monday', 2],
    ['BCA Sem 3 A', 'HU101', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Monday', 3],
    ['BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Monday', 0],
    ['BCA Sem 3 B', 'CS302', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Monday', 1],
    ['BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Monday', 2],
    ['B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Monday', 0],
    ['B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Monday', 1],
    ['B.Tech CSE Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Seminar Hall 1', 'Monday', 4],

    // Tuesday
    ['BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Tuesday', 0],
    ['BCA Sem 3 A', 'CS303', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Tuesday', 1],
    ['BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Tuesday', 2],
    ['BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Tuesday', 0],
    ['BCA Sem 3 B', 'HU101', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Tuesday', 1],
    ['BCA Sem 3 B', 'CS401', 'Prof. Priya Nair', 'Room 102 (Lecture Hall B)', 'Tuesday', 2],
    ['B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Seminar Hall 1', 'Tuesday', 2],
    ['B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Tuesday', 3],

    // Wednesday
    ['BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Wednesday', 1],
    ['BCA Sem 3 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Room 101 (Lecture Hall A)', 'Wednesday', 2],
    ['BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Wednesday', 3],
    ['B.Tech IT Sem 5 A', 'CS302', 'Prof. Priya Nair', 'Lab 205 (Computing Lab 2)', 'Wednesday', 0],
    ['B.Tech IT Sem 5 A', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Wednesday', 1],
    ['B.Tech IT Sem 5 A', 'HU101', 'Prof. Neha Gupta', 'Room 102 (Lecture Hall B)', 'Wednesday', 2],

    // Thursday
    ['BCA Sem 3 A', 'MA201', 'Prof. Sunita Verma', 'Room 101 (Lecture Hall A)', 'Thursday', 0],
    ['BCA Sem 3 A', 'CS303', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Thursday', 1],
    ['BCA Sem 3 B', 'CS302', 'Prof. Priya Nair', 'Lab 204 (Computing Lab 1)', 'Thursday', 1],
    ['B.Tech CSE Sem 5 A', 'CS301', 'Dr. Ramesh Sharma', 'Seminar Hall 1', 'Thursday', 3],
    ['B.Tech CSE Sem 5 A', 'CS401', 'Dr. Rajesh Kulkarni', 'Seminar Hall 1', 'Thursday', 4],

    // Friday
    ['BCA Sem 3 A', 'CS301', 'Dr. Ramesh Sharma', 'Room 101 (Lecture Hall A)', 'Friday', 0],
    ['BCA Sem 3 A', 'HU101', 'Prof. Neha Gupta', 'Room 101 (Lecture Hall A)', 'Friday', 1],
    ['BCA Sem 3 B', 'MA201', 'Prof. Sunita Verma', 'Room 102 (Lecture Hall B)', 'Friday', 2],
    ['B.Tech IT Sem 5 A', 'CS401', 'Dr. Amit Joshi', 'Lab 205 (Computing Lab 2)', 'Friday', 3],

    // Saturday
    ['BCA Sem 3 A', 'CS302', 'Prof. Ananya Iyer', 'Lab 204 (Computing Lab 1)', 'Saturday', 0],
    ['BCA Sem 3 B', 'CS301', 'Dr. Vikram Deshmukh', 'Room 102 (Lecture Hall B)', 'Saturday', 1],
    ['B.Tech CSE Sem 5 A', 'CS303', 'Dr. Amit Joshi', 'Seminar Hall 1', 'Saturday', 1],
  ];

  let insertedSchedule = 0;
  for (const [gName, sCode, fName, rName, day, slotIdx] of scheduleEntries) {
    const gId = groupMap[gName];
    const sId = subjectMap[sCode];
    const fId = facultyMap[fName];
    const rId = roomMap[rName];
    const ts = slotList[slotIdx];

    if (gId && sId && fId && rId && ts) {
      await supabase.from('timetable').insert({
        group_id: gId,
        subject_id: sId,
        faculty_id: fId,
        room_id: rId,
        day,
        timeslot_id: ts.id,
      });
      insertedSchedule++;
    }
  }

  console.log(`Successfully inserted ${insertedSchedule} timetable schedule records.`);
  console.log('Seeding complete!');
}

seed().catch((err) => {
  console.error('Fatal error during seed:', err);
  process.exit(1);
});
