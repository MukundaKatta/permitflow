import { createServiceClient } from "@permitflow/supabase";
import type { ScrapedRegulation } from "./scrapers/types";
import { createHash } from "crypto";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 400;

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model.
 * Using OpenAI embeddings as they produce 1536-dimensional vectors
 * compatible with pgvector's ivfflat index.
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required for embedding generation");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8000)),
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${error}`);
  }

  const data: EmbeddingResponse = await response.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/**
 * Split content into overlapping chunks for embedding.
 * Attempts to split on paragraph/sentence boundaries.
 */
function chunkContent(content: string): string[] {
  if (content.length <= CHUNK_SIZE) {
    return [content];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < content.length) {
    let endIndex = startIndex + CHUNK_SIZE;

    if (endIndex < content.length) {
      // Try to find a paragraph break
      const paragraphBreak = content.lastIndexOf("\n\n", endIndex);
      if (paragraphBreak > startIndex + CHUNK_SIZE * 0.5) {
        endIndex = paragraphBreak;
      } else {
        // Try sentence break
        const sentenceBreak = content.lastIndexOf(". ", endIndex);
        if (sentenceBreak > startIndex + CHUNK_SIZE * 0.5) {
          endIndex = sentenceBreak + 1;
        }
      }
    } else {
      endIndex = content.length;
    }

    chunks.push(content.slice(startIndex, endIndex).trim());
    startIndex = endIndex - CHUNK_OVERLAP;

    if (startIndex + CHUNK_OVERLAP >= content.length) break;
  }

  return chunks.filter((c) => c.length > 50);
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

interface EmbedRegulationOptions {
  jurisdictionId: string;
  regulation: ScrapedRegulation;
  supabaseUrl: string;
  serviceRoleKey: string;
}

/**
 * Embed a single regulation into the database.
 * Chunks long content and generates embeddings for each chunk.
 * Uses content hashing to avoid re-embedding unchanged content.
 */
export async function embedRegulation(options: EmbedRegulationOptions): Promise<number> {
  const { jurisdictionId, regulation, supabaseUrl, serviceRoleKey } = options;
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const contentHash = hashContent(regulation.content);

  // Check if this regulation already exists with the same content
  const { data: existing } = await supabase
    .from("regulations")
    .select("id")
    .eq("jurisdiction_id", jurisdictionId)
    .eq("content_hash", contentHash)
    .limit(1);

  if (existing && existing.length > 0) {
    // Update last_verified_at timestamp only
    await supabase
      .from("regulations")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("id", existing[0].id);
    return 0;
  }

  // Delete old versions of this regulation (by section code or title)
  if (regulation.sectionCode) {
    await supabase
      .from("regulations")
      .delete()
      .eq("jurisdiction_id", jurisdictionId)
      .eq("section_code", regulation.sectionCode);
  }

  // Chunk the content
  const chunks = chunkContent(regulation.content);
  const embeddingTexts = chunks.map(
    (chunk, i) =>
      `${regulation.title}${regulation.sectionCode ? ` (${regulation.sectionCode})` : ""} - ${regulation.category}\n\n${chunk}`
  );

  // Generate embeddings in batches of 20
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < embeddingTexts.length; i += 20) {
    const batch = embeddingTexts.slice(i, i + 20);
    const embeddings = await generateEmbeddings(batch);
    allEmbeddings.push(...embeddings);
  }

  // Insert the first chunk as the parent regulation
  const { data: parent, error: parentError } = await supabase
    .from("regulations")
    .insert({
      jurisdiction_id: jurisdictionId,
      title: regulation.title,
      section_code: regulation.sectionCode,
      content: chunks[0],
      summary: regulation.summary,
      category: regulation.category,
      subcategory: regulation.subcategory,
      applicable_industries: regulation.applicableIndustries,
      applicable_entity_types: regulation.applicableEntityTypes as any[],
      source_url: regulation.sourceUrl,
      effective_date: regulation.effectiveDate,
      embedding: allEmbeddings[0] as any,
      chunk_index: 0,
      content_hash: hashContent(chunks[0]),
      last_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (parentError) {
    throw new Error(`Failed to insert parent regulation: ${parentError.message}`);
  }

  // Insert remaining chunks as children
  if (chunks.length > 1) {
    const childInserts = chunks.slice(1).map((chunk, i) => ({
      jurisdiction_id: jurisdictionId,
      title: `${regulation.title} (Part ${i + 2})`,
      section_code: regulation.sectionCode,
      content: chunk,
      summary: null,
      category: regulation.category,
      subcategory: regulation.subcategory,
      applicable_industries: regulation.applicableIndustries,
      applicable_entity_types: regulation.applicableEntityTypes as any[],
      source_url: regulation.sourceUrl,
      effective_date: regulation.effectiveDate,
      embedding: allEmbeddings[i + 1] as any,
      chunk_index: i + 1,
      parent_regulation_id: parent.id,
      content_hash: hashContent(chunk),
      last_verified_at: new Date().toISOString(),
    }));

    const { error: childError } = await supabase.from("regulations").insert(childInserts);
    if (childError) {
      console.error(`Warning: Failed to insert child chunks: ${childError.message}`);
    }
  }

  return chunks.length;
}

/**
 * Embed a query string for similarity search.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([query]);
  return embeddings[0];
}
