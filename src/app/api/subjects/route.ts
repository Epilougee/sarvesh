import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("subjects").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subjects: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const body = await req.json();

  // 1. Bulk import handling (from Excel / CSV upload)
  if (body.bulk && Array.isArray(body.bulk)) {
    const rawList = body.bulk;
    const validList: { name: string; code: string }[] = [];

    for (const item of rawList) {
      const name = (item.name || item["Subject Name"] || item["subject_name"] || "").toString().trim();
      const code = (item.code || item["Subject Code"] || item["subject_code"] || "").toString().trim().toUpperCase();
      if (name && code) {
        validList.push({ name, code });
      }
    }

    if (validList.length === 0) {
      return NextResponse.json(
        { error: "No valid subject records found in uploaded data. Expected columns: 'Subject Name' and 'Subject Code'." },
        { status: 400 }
      );
    }

    // Upsert or insert all valid subjects
    const { data: inserted, error: bulkErr } = await supabase
      .from("subjects")
      .upsert(validList, { onConflict: "code" })
      .select();

    if (bulkErr) {
      return NextResponse.json({ error: bulkErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      importedCount: validList.length,
      subjects: inserted,
    });
  }

  // 2. Single subject creation
  const { name, code } = body;
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({ name: name.trim(), code: code.trim().toUpperCase() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, subject: data });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, name, code } = await req.json();
  if (!id || !name || !code) {
    return NextResponse.json({ error: "ID, name, and code required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("subjects")
    .update({ name: name.trim(), code: code.trim().toUpperCase() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
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
  const { error } = await supabase.from("subjects").delete().eq("id", parseInt(id, 10));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
