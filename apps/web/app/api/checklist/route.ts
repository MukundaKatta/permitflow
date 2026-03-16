import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateChecklist } from "@permitflow/ai-engine";
import type { BusinessProfile } from "@permitflow/supabase";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Business profile not found. Complete onboarding first." },
      { status: 400 }
    );
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    const generatedPermits = await generateChecklist(
      profile as BusinessProfile,
      supabase,
      anthropicApiKey
    );

    // Delete existing AI-generated permits and replace
    await supabase
      .from("permits")
      .delete()
      .eq("organization_id", org.id)
      .eq("ai_generated", true);

    // Insert new permits
    const permitInserts = generatedPermits.map((p, index) => ({
      organization_id: org.id,
      business_profile_id: profile.id,
      name: p.name,
      description: p.description,
      category: p.category,
      status: "not_started" as const,
      priority: p.priority,
      estimated_cost: p.estimatedCost,
      estimated_processing_days: p.estimatedProcessingDays,
      requirements: p.requirements,
      application_url: p.applicationUrl,
      ai_generated: true,
      sort_order: index,
      regulation_id: p.regulationId,
    }));

    const { data: permits, error } = await supabase
      .from("permits")
      .insert(permitInserts)
      .select("id, name");

    if (error) {
      return NextResponse.json({ error: "Failed to save permits" }, { status: 500 });
    }

    return NextResponse.json({
      permits: permits || [],
      count: generatedPermits.length,
    });
  } catch (err) {
    console.error("Checklist regeneration error:", err);
    return NextResponse.json(
      { error: "Failed to generate checklist" },
      { status: 500 }
    );
  }
}
