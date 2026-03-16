import Anthropic from "@anthropic-ai/sdk";
import type { BusinessProfile } from "@permitflow/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "@permitflow/regulations";

export interface GeneratedPermit {
  name: string;
  description: string;
  category: string;
  priority: number;
  estimatedCost: number | null;
  estimatedProcessingDays: number | null;
  requirements: { label: string; description: string; completed: boolean }[];
  applicationUrl: string | null;
  jurisdictionLevel: "federal" | "state" | "county" | "city";
  regulationId: string | null;
}

interface RegulationMatch {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  source_url: string;
  similarity: number;
  jurisdiction_id: string;
}

/**
 * Generate a comprehensive permit checklist for a business based on its profile.
 * Uses RAG to find relevant regulations, then uses Claude to analyze and create
 * a structured checklist.
 */
export async function generateChecklist(
  profile: BusinessProfile,
  supabase: SupabaseClient,
  anthropicApiKey: string
): Promise<GeneratedPermit[]> {
  // Step 1: Build search queries based on business profile
  const searchQueries = buildSearchQueries(profile);

  // Step 2: Retrieve relevant regulations via vector similarity search
  const allRegulations: RegulationMatch[] = [];
  const seenIds = new Set<string>();

  for (const query of searchQueries) {
    try {
      const queryEmbedding = await embedQuery(query);

      const { data: matches } = await supabase.rpc("match_regulations", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 8,
      });

      if (matches) {
        for (const match of matches as RegulationMatch[]) {
          if (!seenIds.has(match.id)) {
            seenIds.add(match.id);
            allRegulations.push(match);
          }
        }
      }
    } catch (err) {
      console.error(`Embedding search failed for query "${query}":`, err);
    }
  }

  // Step 3: Also do a direct category/industry search as fallback
  const { data: directMatches } = await supabase
    .from("regulations")
    .select("id, title, content, summary, category, source_url, jurisdiction_id")
    .or(
      `applicable_industries.cs.{${profile.industry}},applicable_industries.cs.{all}`
    )
    .is("parent_regulation_id", null)
    .limit(20);

  if (directMatches) {
    for (const match of directMatches) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        allRegulations.push({ ...match, similarity: 0.5 });
      }
    }
  }

  // Sort by relevance
  allRegulations.sort((a, b) => b.similarity - a.similarity);

  // Step 4: Use Claude to generate structured checklist
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const regulationContext = allRegulations
    .slice(0, 15)
    .map(
      (r) =>
        `### ${r.title} (${r.category})\n${r.summary || r.content.slice(0, 500)}\nSource: ${r.source_url || "N/A"}\nRegulation ID: ${r.id}\nJurisdiction ID: ${r.jurisdiction_id}`
    )
    .join("\n\n---\n\n");

  const businessDescription = formatBusinessDescription(profile);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a business compliance expert. Based on the business profile and applicable regulations below, generate a comprehensive checklist of all permits, licenses, and registrations this business needs to operate legally.

## Business Profile
${businessDescription}

## Applicable Regulations Found
${regulationContext}

## Instructions
Generate a JSON array of permits/licenses needed. For each item include:
- name: Clear permit/license name
- description: Brief explanation of what this permit is and why it's needed
- category: One of: business_license, health_permit, liquor_license, building_permit, sign_permit, fire_permit, zoning, state_license, professional_license, employer_requirements, federal_requirements
- priority: 1-10 (10 = must have before operating, 1 = nice to have)
- estimatedCost: Dollar amount or null if free/unknown
- estimatedProcessingDays: Number of days or null
- requirements: Array of {label, description, completed: false} for step-by-step tasks
- applicationUrl: URL if available from the regulation source, else null
- jurisdictionLevel: federal, state, county, or city
- regulationId: The Regulation ID from the context if directly matched, else null

Order by priority (highest first). Include ALL applicable permits - be thorough. Consider the specific business characteristics (food service, alcohol, employees, home-based, signage, etc.).

Respond with ONLY the JSON array, no other text.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse the JSON response
  let permits: GeneratedPermit[];
  try {
    // Handle potential markdown code blocks
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    permits = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse checklist from Claude: ${(err as Error).message}`);
  }

  // Validate and normalize
  return permits.map((p) => ({
    name: p.name,
    description: p.description || "",
    category: p.category || "business_license",
    priority: Math.min(10, Math.max(1, p.priority || 5)),
    estimatedCost: p.estimatedCost,
    estimatedProcessingDays: p.estimatedProcessingDays,
    requirements: Array.isArray(p.requirements)
      ? p.requirements.map((r) => ({
          label: r.label,
          description: r.description || "",
          completed: false,
        }))
      : [],
    applicationUrl: p.applicationUrl,
    jurisdictionLevel: p.jurisdictionLevel || "state",
    regulationId: p.regulationId,
  }));
}

function buildSearchQueries(profile: BusinessProfile): string[] {
  const queries: string[] = [];
  const location = `${profile.city}, ${profile.county ? profile.county + " County, " : ""}${profile.state}`;

  queries.push(
    `business license requirements for ${profile.industry} in ${location}`
  );
  queries.push(
    `${profile.entity_type} business registration requirements ${profile.state}`
  );

  if (profile.serves_food) {
    queries.push(`food service health permit restaurant requirements ${location}`);
    queries.push(`food handler certification requirements ${profile.state}`);
  }

  if (profile.sells_alcohol) {
    queries.push(`liquor license alcohol permit requirements ${location}`);
  }

  if (profile.has_employees) {
    queries.push(`employer registration requirements workers compensation ${profile.state}`);
    queries.push(`federal employer requirements EIN tax withholding`);
  }

  if (profile.has_signage) {
    queries.push(`sign permit requirements ${location}`);
  }

  if (profile.operates_from_home) {
    queries.push(`home occupation permit home based business ${location}`);
  }

  if (profile.handles_hazardous_materials) {
    queries.push(`hazardous materials permit fire prevention ${location}`);
  }

  queries.push(`federal business tax requirements ${profile.entity_type}`);
  queries.push(`state business license ${profile.state}`);

  return queries;
}

function formatBusinessDescription(profile: BusinessProfile): string {
  const lines: string[] = [
    `Business Name: ${profile.business_name}`,
    `Entity Type: ${profile.entity_type.replace(/_/g, " ")}`,
    `Industry: ${profile.industry}`,
    `Location: ${profile.street_address}, ${profile.city}, ${profile.county ? profile.county + " County, " : ""}${profile.state} ${profile.zip_code}`,
  ];

  if (profile.naics_code) lines.push(`NAICS Code: ${profile.naics_code}`);
  if (profile.description) lines.push(`Description: ${profile.description}`);
  if (profile.employee_count > 0) lines.push(`Employees: ${profile.employee_count}`);
  if (profile.annual_revenue_range) lines.push(`Revenue Range: ${profile.annual_revenue_range}`);

  const flags: string[] = [];
  if (profile.serves_food) flags.push("Serves food");
  if (profile.sells_alcohol) flags.push("Sells alcohol");
  if (profile.handles_hazardous_materials) flags.push("Handles hazardous materials");
  if (profile.has_signage) flags.push("Has signage");
  if (profile.has_employees) flags.push("Has employees");
  if (profile.operates_from_home) flags.push("Home-based business");

  if (flags.length > 0) {
    lines.push(`Special Characteristics: ${flags.join(", ")}`);
  }

  return lines.join("\n");
}
