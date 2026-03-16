import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const createDeadlineSchema = z.object({
  permitId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  deadlineType: z.enum(["application", "renewal", "inspection", "payment", "document_submission", "hearing"]),
  dueDate: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceMonths: z.number().optional(),
  reminderDaysBefore: z.array(z.number()).default([30, 14, 7, 1]),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createDeadlineSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify permit ownership
  const { data: permit } = await supabase
    .from("permits")
    .select("organization_id")
    .eq("id", body.permitId)
    .single();

  if (!permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", permit.organization_id)
    .eq("owner_id", user.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: deadline, error } = await supabase
    .from("permit_deadlines")
    .insert({
      permit_id: body.permitId,
      organization_id: org.id,
      title: body.title,
      description: body.description || null,
      deadline_type: body.deadlineType,
      due_date: body.dueDate,
      is_recurring: body.isRecurring,
      recurrence_months: body.recurrenceMonths || null,
      reminder_days_before: body.reminderDaysBefore,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(deadline);
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, completed } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Missing deadline ID" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (completed !== undefined) {
    updates.completed = completed;
    updates.completed_at = completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("permit_deadlines")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
