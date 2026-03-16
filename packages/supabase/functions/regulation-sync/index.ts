// Supabase Edge Function: regulation-sync
// Checks for updated regulations and triggers re-scraping when content changes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

interface RegulationRow {
  id: string;
  source_url: string | null;
  content_hash: string;
  jurisdiction_id: string;
  title: string;
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getEmbedding(text: string): Promise<number[]> {
  // Use Anthropic's recommended embedding approach via a smaller model call
  // In production, you'd use a dedicated embedding model (e.g., text-embedding-3-small)
  // For this implementation, we use a simple hash-based fallback or OpenAI embeddings
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY") || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PermitFlow-RegSync/1.0 (compliance monitoring)",
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get regulations that haven't been checked recently (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: regulations, error } = await supabase
    .from("regulations")
    .select("id, source_url, content_hash, jurisdiction_id, title")
    .lt("last_verified_at", sevenDaysAgo)
    .not("source_url", "is", null)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!regulations || regulations.length === 0) {
    return new Response(JSON.stringify({ checked: 0, updated: 0 }), { status: 200 });
  }

  let checkedCount = 0;
  let updatedCount = 0;
  const updateErrors: string[] = [];

  for (const reg of regulations as RegulationRow[]) {
    try {
      if (!reg.source_url) continue;

      const pageContent = await fetchPageContent(reg.source_url);
      if (!pageContent) {
        checkedCount++;
        continue;
      }

      const newHash = await hashContent(pageContent);

      if (newHash !== reg.content_hash) {
        // Content has changed - use Claude to extract the updated regulation text
        const extractionResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "content-type": "application/json",
            "anthropic-version": "2024-01-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: `Extract the main regulatory content from this HTML page. The regulation is titled "${reg.title}". Return ONLY the regulatory text content, cleaned of HTML tags, navigation elements, and other non-content elements. Preserve section numbers and structure.\n\nHTML:\n${pageContent.slice(0, 50000)}`,
              },
            ],
          }),
        });

        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json();
          const newContent = extractionData.content[0].text;

          // Generate new embedding
          let embedding: number[] | null = null;
          try {
            embedding = await getEmbedding(newContent);
          } catch {
            // Continue without embedding update
          }

          const updateData: Record<string, unknown> = {
            content: newContent,
            content_hash: newHash,
            last_verified_at: new Date().toISOString(),
          };

          if (embedding) {
            updateData.embedding = embedding;
          }

          await supabase.from("regulations").update(updateData).eq("id", reg.id);

          updatedCount++;
        }
      } else {
        // Content unchanged, just update verification timestamp
        await supabase
          .from("regulations")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("id", reg.id);
      }

      checkedCount++;
    } catch (err) {
      updateErrors.push(`Regulation ${reg.id}: ${(err as Error).message}`);
    }
  }

  // Update jurisdiction scrape timestamps
  const jurisdictionIds = [...new Set(regulations.map((r) => r.jurisdiction_id))];
  for (const jId of jurisdictionIds) {
    await supabase
      .from("jurisdictions")
      .update({ last_scraped_at: new Date().toISOString() })
      .eq("id", jId);
  }

  return new Response(
    JSON.stringify({ checked: checkedCount, updated: updatedCount, errors: updateErrors }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
