import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const updatePermitSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum([
      "not_started",
      "in_progress",
      "submitted",
      "under_review",
      "approved",
      "denied",
      "expired",
      "renewal_needed",
    ])
    .optional(),
  application_number: z.string().optional(),
  actual_cost: z.number().nullable().optional(),
  notes: z.string().optional(),
  submitted_at: z.string().optional(),
  approved_at: z.string().optional(),
  expires_at: z.string().optional(),
  requirements: z
    .array(
      z.object({
        label: z.string(),
        description: z.string(),
        completed: z.boolean(),
      })
    )
    .optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = updatePermitSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { id, ...updates } = body;

  // Verify ownership
  const { data: permit } = await supabase
    .from("permits")
    .select("organization_id")
    .eq("id", id)
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

  // If status changed to submitted, set submitted_at
  if (updates.status === "submitted" && !updates.submitted_at) {
    (updates as Record<string, unknown>).submitted_at = new Date().toISOString();
  }
  if (updates.status === "approved" && !updates.approved_at) {
    (updates as Record<string, unknown>).approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("permits")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
