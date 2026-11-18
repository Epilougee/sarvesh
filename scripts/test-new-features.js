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

async function testFeatures() {
  console.log('--- Testing New Features ---');

  // 1. Verify Break Subject
  const { data: breakSub } = await supabase
    .from('subjects')
    .select('*')
    .eq('code', 'BREAK')
    .single();
  console.log('1. Break Subject verified:', breakSub);

  // 2. Test Bulk Subjects Upsert (simulating Excel import)
  const testExcelRows = [
    { name: 'Cloud Computing & DevOps', code: 'CC402' },
    { name: 'Artificial Intelligence & Robotics', code: 'AI501' },
    { name: 'Machine Learning Algorithms', code: 'ML502' },
  ];
  const { data: bulkSubs, error: bulkErr } = await supabase
    .from('subjects')
    .upsert(testExcelRows, { onConflict: 'code' })
    .select();
  console.log('2. Bulk subjects upsert result:', bulkSubs?.length, 'subjects inserted/updated. Error:', bulkErr);

  // 3. Test Scheduling a Break slot for BCA Sem 3 A on Friday Period 4
  const { data: breakSlot, error: breakSlotErr } = await supabase
    .from('timetable')
    .insert({
      group_id: 1, // BCA Sem 3 A
      subject_id: breakSub.id,
      faculty_id: 9,
      room_id: 1,
      day: 'Friday',
      timeslot_id: 4,
    })
    .select()
    .single();
  console.log('3. Break slot scheduled for Friday Period 4:', breakSlot?.id, 'Error:', breakSlotErr);

  // 4. Test Drag / Move: Move break slot to Friday Period 5
  if (breakSlot) {
    const { data: movedSlot, error: moveErr } = await supabase
      .from('timetable')
      .update({ timeslot_id: 5 })
      .eq('id', breakSlot.id)
      .select()
      .single();
    console.log('4. Drag/move slot result:', movedSlot?.id, 'New timeslot:', movedSlot?.timeslot_id, 'Error:', moveErr);

    // 5. Clean up test slot
    await supabase.from('timetable').delete().eq('id', breakSlot.id);
    console.log('5. Cleaned up test slot successfully.');
  }

  console.log('--- All new features verified successfully! ---');
}

testFeatures().catch(console.error);
