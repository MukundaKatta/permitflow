import Anthropic from "@anthropic-ai/sdk";
import type { BusinessProfile, Permit } from "@permitflow/supabase";

export interface FormField {
  fieldName: string;
  fieldLabel: string;
  value: string;
  confidence: number;
  source: "business_profile" | "ai_inferred" | "manual";
  notes: string | null;
}

export interface FilledForm {
  permitName: string;
  formName: string;
  fields: FormField[];
  missingFields: { fieldName: string; fieldLabel: string; reason: string }[];
  instructions: string;
}

/**
 * Auto-fill permit application forms based on business profile data.
 * Uses Claude to map business profile fields to permit application fields
 * and fill in as much as possible.
 */
export async function fillPermitApplication(
  permit: Permit,
  profile: BusinessProfile,
  formTemplate: string | null,
  anthropicApiKey: string
): Promise<FilledForm> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const businessData = {
    businessName: profile.business_name,
    entityType: profile.entity_type,
    industry: profile.industry,
    naicsCode: profile.naics_code,
    description: profile.description,
    employeeCount: profile.employee_count,
    annualRevenue: profile.annual_revenue_range,
    address: {
      street: profile.street_address,
      city: profile.city,
      county: profile.county,
      state: profile.state,
      zip: profile.zip_code,
      country: profile.country,
    },
    contact: {
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
    },
    flags: {
      servesFood: profile.serves_food,
      sellsAlcohol: profile.sells_alcohol,
      hazardousMaterials: profile.handles_hazardous_materials,
      hasSignage: profile.has_signage,
      hasEmployees: profile.has_employees,
      homeBased: profile.operates_from_home,
    },
  };

  const formContext = formTemplate
    ? `\n## Form Template\nThe following is the form structure to fill:\n${formTemplate}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `You are a business permit application specialist. Fill out a permit application form using the available business data.

## Permit Information
Name: ${permit.name}
Category: ${permit.category}
Description: ${permit.description || "N/A"}
Application URL: ${permit.application_url || "N/A"}

## Business Data Available
${JSON.stringify(businessData, null, 2)}
${formContext}

## Instructions
Generate a JSON object with:
1. "formName": Name of the form being filled
2. "fields": Array of filled fields, each with:
   - fieldName: Technical field name (e.g., "applicant_name")
   - fieldLabel: Human-readable label (e.g., "Applicant Legal Name")
   - value: The filled value from business data
   - confidence: 0.0-1.0 how confident the mapping is
   - source: "business_profile" if directly from data, "ai_inferred" if derived
   - notes: Any notes about the field value (null if none)
3. "missingFields": Array of fields that need manual input:
   - fieldName, fieldLabel, reason (why it couldn't be auto-filled)
4. "instructions": Step-by-step instructions for submitting this application

${formTemplate ? "Match the form template fields exactly." : `Generate the typical fields for a ${permit.category} application in ${profile.state}.`}

Common fields to include for ${permit.category} applications:
- Business legal name and DBA (if applicable)
- Business entity type
- Owner/applicant name and contact
- Business address
- Mailing address (if different)
- Federal EIN
- State tax ID
- Business description
- NAICS/SIC code
- Number of employees
- Proposed operating hours
- Square footage of premises
- Any applicable license numbers

Respond with ONLY the JSON object, no other text.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let parsed: FilledForm;
  try {
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse form fill response: ${(err as Error).message}`);
  }

  return {
    permitName: permit.name,
    formName: parsed.formName || `${permit.name} Application`,
    fields: (parsed.fields || []).map((f) => ({
      fieldName: f.fieldName,
      fieldLabel: f.fieldLabel,
      value: f.value || "",
      confidence: Math.min(1, Math.max(0, f.confidence || 0)),
      source: f.source || "ai_inferred",
      notes: f.notes || null,
    })),
    missingFields: parsed.missingFields || [],
    instructions: parsed.instructions || "",
  };
}

/**
 * Generate a pre-filled PDF form data map for common government forms.
 * Returns field name to value mappings that can be used with a PDF filler library.
 */
export function generatePdfFieldMap(
  filledForm: FilledForm
): Record<string, string> {
  const fieldMap: Record<string, string> = {};

  for (const field of filledForm.fields) {
    if (field.value && field.confidence >= 0.5) {
      fieldMap[field.fieldName] = field.value;
    }
  }

  return fieldMap;
}
