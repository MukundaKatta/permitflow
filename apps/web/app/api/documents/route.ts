import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fillPermitApplication } from "@permitflow/ai-engine";
import type { BusinessProfile, Permit } from "@permitflow/supabase";
import { z } from "zod";

const autoFillSchema = z.object({
  permitId: z.string().uuid(),
  action: z.literal("auto-fill"),
  formTemplate: z.string().optional(),
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
    body = autoFillSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Get permit with ownership check
  const { data: permit } = await supabase
    .from("permits")
    .select("*")
    .eq("id", body.permitId)
    .single();

  if (!permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, subscription_tier")
    .eq("id", permit.organization_id)
    .eq("owner_id", user.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check subscription allows auto-fill
  if (org.subscription_tier === "free") {
    return NextResponse.json(
      { error: "Auto-fill requires a Starter plan or higher" },
      { status: 403 }
    );
  }

  // Get business profile
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Business profile not found" }, { status: 400 });
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    const filledForm = await fillPermitApplication(
      permit as Permit,
      profile as BusinessProfile,
      body.formTemplate || null,
      anthropicApiKey
    );

    // Store the auto-filled form data as a document
    const formJson = JSON.stringify(filledForm, null, 2);
    const encoder = new TextEncoder();
    const formBuffer = encoder.encode(formJson);

    const storagePath = `${org.id}/auto-fill/${permit.id}-${Date.now()}.json`;

    await supabase.storage.from("documents").upload(storagePath, formBuffer, {
      contentType: "application/json",
    });

    // Create document record
    const { data: doc } = await supabase
      .from("documents")
      .insert({
        organization_id: org.id,
        permit_id: permit.id,
        name: `${filledForm.formName} - Auto-Filled`,
        document_type: "application_form",
        storage_path: storagePath,
        mime_type: "application/json",
        size_bytes: formBuffer.length,
        is_auto_filled: true,
        auto_fill_data: filledForm as unknown as Record<string, unknown>,
        uploaded_by: user.id,
      })
      .select()
      .single();

    return NextResponse.json({
      document: doc,
      filledForm,
      fieldsCount: filledForm.fields.length,
      missingCount: filledForm.missingFields.length,
    });
  } catch (err) {
    console.error("Auto-fill error:", err);
    return NextResponse.json(
      { error: "Failed to auto-fill form" },
      { status: 500 }
    );
  }
}
