import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateChecklist } from "@permitflow/ai-engine";
import type { BusinessProfile } from "@permitflow/supabase";
import { z } from "zod";

const onboardingSchema = z.object({
  businessName: z.string().min(1),
  entityType: z.enum(["sole_proprietorship", "llc", "corporation", "s_corp", "partnership", "nonprofit"]),
  industry: z.string().min(1),
  description: z.string().optional().default(""),
  employeeCount: z.string().transform(Number).pipe(z.number().min(0)),
  annualRevenue: z.string().optional().default(""),
  streetAddress: z.string().min(1),
  city: z.string().min(1),
  county: z.string().optional().default(""),
  state: z.string().length(2),
  zipCode: z.string().min(5),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  website: z.string().optional().default(""),
  servesFood: z.boolean().default(false),
  sellsAlcohol: z.boolean().default(false),
  hazardousMaterials: z.boolean().default(false),
  hasSignage: z.boolean().default(false),
  hasEmployees: z.boolean().default(false),
  homeBased: z.boolean().default(false),
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
    const raw = await request.json();
    body = onboardingSchema.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Create or update organization
  let { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!org) {
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: body.businessName,
        owner_id: user.id,
        subscription_tier: "free",
      })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }
    org = newOrg;
  }

  // Create business profile
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .insert({
      organization_id: org.id,
      business_name: body.businessName,
      entity_type: body.entityType,
      industry: body.industry,
      description: body.description || null,
      employee_count: body.employeeCount,
      annual_revenue_range: body.annualRevenue || null,
      street_address: body.streetAddress,
      city: body.city,
      county: body.county || null,
      state: body.state,
      zip_code: body.zipCode,
      country: "US",
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      serves_food: body.servesFood,
      sells_alcohol: body.sellsAlcohol,
      handles_hazardous_materials: body.hazardousMaterials,
      has_signage: body.hasSignage,
      has_employees: body.hasEmployees,
      operates_from_home: body.homeBased,
      onboarding_completed: true,
    })
    .select()
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Failed to create business profile" },
      { status: 500 }
    );
  }

  // Generate permit checklist using AI
  try {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const generatedPermits = await generateChecklist(
      profile as BusinessProfile,
      supabase,
      anthropicApiKey
    );

    // Insert generated permits
    const permitInserts = generatedPermits.map((p, index) => ({
      organization_id: org!.id,
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

    const { error: permitsError } = await supabase
      .from("permits")
      .insert(permitInserts);

    if (permitsError) {
      console.error("Error inserting permits:", permitsError);
    }

    // Create default notification preferences
    await supabase.from("notification_preferences").insert({
      user_id: user.id,
      organization_id: org!.id,
      email_enabled: true,
      push_enabled: true,
      reminder_days: [30, 14, 7, 1],
      daily_digest: false,
    });

    return NextResponse.json({
      organizationId: org!.id,
      profileId: profile.id,
      permitsGenerated: generatedPermits.length,
    });
  } catch (err) {
    console.error("Checklist generation error:", err);
    // Still return success - permits can be generated later
    return NextResponse.json({
      organizationId: org!.id,
      profileId: profile.id,
      permitsGenerated: 0,
      warning: "Permit checklist generation is still processing",
    });
  }
}
