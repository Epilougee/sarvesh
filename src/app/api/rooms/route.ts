import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("rooms").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rooms: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, capacity } = await req.json();
  if (!name) return NextResponse.json({ error: "Room name required" }, { status: 400 });

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert({ name: name.trim(), capacity: parseInt(capacity || "40", 10) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, room: data });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, name, capacity } = await req.json();
  if (!id || !name) return NextResponse.json({ error: "ID and name required" }, { status: 400 });

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({ name: name.trim(), capacity: parseInt(capacity || "40", 10) })
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
  const { error } = await supabase.from("rooms").delete().eq("id", parseInt(id, 10));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

