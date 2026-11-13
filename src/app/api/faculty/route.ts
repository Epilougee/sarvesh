import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("faculty")
    .select(
      `
      id,
      department,
      designation,
      phone,
      users:user_id (id, name, email)
    `
    )
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ faculty: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, email, department, designation, phone, password, subject_ids } =
      await req.json();

    if (!name || !email || !department || !designation) {
      return NextResponse.json(
        { error: "Name, email, department, and designation required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const passwordHash = await bcrypt.hash(password || "password123", 10);

    // 1. Create user
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: "faculty",
      })
      .select()
      .single();

    if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });

    // 2. Create faculty profile
    const { data: newFaculty, error: facError } = await supabase
      .from("faculty")
      .insert({
        user_id: newUser.id,
        department: department.trim(),
        designation: designation.trim(),
        phone: phone ? phone.trim() : null,
      })
      .select()
      .single();

    if (facError) return NextResponse.json({ error: facError.message }, { status: 500 });

    // 3. Link subjects if provided
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      const mappings = subject_ids.map((sid: number) => ({
        faculty_id: newFaculty.id,
        subject_id: sid,
      }));
      await supabase.from("faculty_subjects").insert(mappings);
    }

    return NextResponse.json({ success: true, faculty: newFaculty });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = getAdminClient();

  // Find user_id first to cascade delete
  const { data: fac } = await supabase
    .from("faculty")
    .select("user_id")
    .eq("id", parseInt(id, 10))
    .single();

  if (fac && fac.user_id) {
    await supabase.from("users").delete().eq("id", fac.user_id);
  } else {
    await supabase.from("faculty").delete().eq("id", parseInt(id, 10));
  }

  return NextResponse.json({ success: true });
}

