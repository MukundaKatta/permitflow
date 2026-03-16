import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdvisorResponse } from "@permitflow/ai-engine";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().uuid(),
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
    body = chatSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, subscription_tier")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Check message limits for free/starter tiers
  if (org.subscription_tier === "free" || org.subscription_tier === "starter") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("chat_history")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", thirtyDaysAgo);

    const limit = org.subscription_tier === "free" ? 10 : 50;
    if ((count || 0) >= limit) {
      return NextResponse.json(
        {
          error: `Monthly message limit reached (${limit} messages). Upgrade your plan for more.`,
        },
        { status: 429 }
      );
    }
  }

  // Get business profile for context
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  // Get chat history for this session
  const { data: history } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("session_id", body.sessionId)
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true })
    .limit(20);

  // Save user message
  await supabase.from("chat_history").insert({
    organization_id: org.id,
    user_id: user.id,
    session_id: body.sessionId,
    role: "user",
    content: body.message,
  });

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    const response = await getAdvisorResponse(
      body.message,
      profile || null,
      (history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      supabase,
      anthropicApiKey
    );

    // Save assistant response
    await supabase.from("chat_history").insert({
      organization_id: org.id,
      user_id: user.id,
      session_id: body.sessionId,
      role: "assistant",
      content: response.content,
      referenced_regulation_ids: response.referencedRegulationIds,
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      model: response.model,
    });

    return NextResponse.json({
      content: response.content,
      referencedRegulationIds: response.referencedRegulationIds,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 }
    );
  }
}
