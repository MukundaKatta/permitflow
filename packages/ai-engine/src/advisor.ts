import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessProfile, ChatMessage } from "@permitflow/supabase";
import { embedQuery } from "@permitflow/regulations";

export interface AdvisorResponse {
  content: string;
  referencedRegulationIds: string[];
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface RegulationContext {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string;
  sourceUrl: string | null;
  similarity: number;
}

const SYSTEM_PROMPT = `You are PermitFlow's AI Compliance Advisor, an expert in business permits, licenses, and regulatory compliance for small and medium businesses in the United States.

Your role is to:
1. Answer questions about permits, licenses, and regulatory requirements
2. Explain compliance obligations clearly and accurately
3. Help business owners understand what they need to do to operate legally
4. Provide step-by-step guidance for permit applications
5. Alert users to important deadlines and renewal requirements

Guidelines:
- Always cite specific regulations or sources when available
- Be specific about costs, timelines, and requirements
- Clearly distinguish between federal, state, and local requirements
- If you're not certain about something, say so and recommend they verify with the relevant government agency
- Use clear, jargon-free language
- Format responses with markdown for readability
- When mentioning a regulation from the provided context, reference it naturally (e.g., "According to Clark County Code 6.04.010...")
- Never provide legal advice - always recommend consulting with a licensed attorney for complex legal questions
- Be proactive about mentioning related permits or requirements the user may not have asked about`;

/**
 * RAG-powered compliance chat advisor.
 * Searches relevant regulations and uses Claude to provide informed answers.
 */
export async function getAdvisorResponse(
  userMessage: string,
  profile: BusinessProfile | null,
  chatHistory: Pick<ChatMessage, "role" | "content">[],
  supabase: SupabaseClient,
  anthropicApiKey: string
): Promise<AdvisorResponse> {
  // Step 1: Search for relevant regulations using the user's query
  const regulationContext = await searchRegulations(userMessage, profile, supabase);

  // Step 2: Build the conversation with context
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const contextBlock = regulationContext.length > 0
    ? `\n\n## Relevant Regulations\nThe following regulations may be relevant to the user's question:\n\n${regulationContext
        .map(
          (r) =>
            `### ${r.title} (${r.category})\n${r.content}\n${r.sourceUrl ? `Source: ${r.sourceUrl}` : ""}`
        )
        .join("\n\n---\n\n")}`
    : "";

  const profileBlock = profile
    ? `\n\n## User's Business Profile\n- Business: ${profile.business_name}\n- Type: ${profile.entity_type}\n- Industry: ${profile.industry}\n- Location: ${profile.city}, ${profile.county ? profile.county + " County, " : ""}${profile.state} ${profile.zip_code}\n- Employees: ${profile.employee_count}\n- Serves food: ${profile.serves_food}\n- Sells alcohol: ${profile.sells_alcohol}\n- Home-based: ${profile.operates_from_home}`
    : "";

  const systemMessage = SYSTEM_PROMPT + profileBlock + contextBlock;

  // Build messages array with chat history
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Include last 10 messages of history for context
  const recentHistory = chatHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current message
  messages.push({ role: "user", content: userMessage });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemMessage,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return {
    content: textContent.text,
    referencedRegulationIds: regulationContext.map((r) => r.id),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: response.model,
  };
}

/**
 * Search regulations using vector similarity and keyword matching.
 */
async function searchRegulations(
  query: string,
  profile: BusinessProfile | null,
  supabase: SupabaseClient
): Promise<RegulationContext[]> {
  const results: RegulationContext[] = [];
  const seenIds = new Set<string>();

  // Vector similarity search
  try {
    const queryEmbedding = await embedQuery(query);

    const { data: vectorResults } = await supabase.rpc("match_regulations", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 6,
    });

    if (vectorResults) {
      for (const r of vectorResults) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          results.push({
            id: r.id,
            title: r.title,
            content: r.content,
            summary: r.summary,
            category: r.category,
            sourceUrl: r.source_url,
            similarity: r.similarity,
          });
        }
      }
    }
  } catch (err) {
    console.error("Vector search failed:", err);
  }

  // Trigram text search as fallback
  const searchTerms = query
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .slice(0, 5)
    .join(" & ");

  if (searchTerms) {
    const { data: textResults } = await supabase
      .from("regulations")
      .select("id, title, content, summary, category, source_url")
      .or(`title.ilike.%${searchTerms}%,content.ilike.%${searchTerms}%`)
      .is("parent_regulation_id", null)
      .limit(4);

    if (textResults) {
      for (const r of textResults) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          results.push({
            id: r.id,
            title: r.title,
            content: r.content,
            summary: r.summary,
            category: r.category,
            sourceUrl: r.source_url,
            similarity: 0.4,
          });
        }
      }
    }
  }

  // Sort by similarity and limit context window
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, 8);
}

/**
 * Generate a conversation summary for long chat sessions.
 */
export async function summarizeConversation(
  messages: Pick<ChatMessage, "role" | "content">[],
  anthropicApiKey: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Summarize this compliance consultation conversation in 2-3 sentences, noting the key topics discussed and any action items identified:\n\n${conversationText}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  return textContent?.type === "text" ? textContent.text : "Conversation summary unavailable.";
}
