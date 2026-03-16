import { createServiceClient } from "@permitflow/supabase";
import { getAllScrapers } from "./scrapers";
import { embedRegulation } from "./embedder";

interface UpdateResult {
  jurisdiction: string;
  regulationsProcessed: number;
  chunksCreated: number;
  errors: string[];
}

/**
 * Check for regulation changes across all jurisdictions.
 * Re-scrapes sources and updates embeddings for changed content.
 */
export async function checkForUpdates(): Promise<UpdateResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const scrapers = getAllScrapers();
  const results: UpdateResult[] = [];

  for (const scraper of scrapers) {
    const result: UpdateResult = {
      jurisdiction: scraper.name,
      regulationsProcessed: 0,
      chunksCreated: 0,
      errors: [],
    };

    try {
      console.log(`Checking updates for: ${scraper.name}`);
      const scraperResult = await scraper.scrape();

      // Find or create the jurisdiction
      const jurisdictionQuery = {
        level: scraperResult.jurisdictionLevel,
        state: scraperResult.state,
        county: scraperResult.county,
        city: scraperResult.city,
      };

      const { data: existingJurisdiction } = await supabase
        .from("jurisdictions")
        .select("id")
        .match(jurisdictionQuery)
        .single();

      let jurisdictionId: string;

      if (existingJurisdiction) {
        jurisdictionId = existingJurisdiction.id;
      } else {
        const { data: newJurisdiction, error } = await supabase
          .from("jurisdictions")
          .insert({
            name: scraper.name,
            ...jurisdictionQuery,
          })
          .select("id")
          .single();

        if (error || !newJurisdiction) {
          result.errors.push(`Failed to create jurisdiction: ${error?.message}`);
          results.push(result);
          continue;
        }
        jurisdictionId = newJurisdiction.id;
      }

      // Process each regulation
      for (const regulation of scraperResult.regulations) {
        try {
          const chunksCreated = await embedRegulation({
            jurisdictionId,
            regulation,
            supabaseUrl,
            serviceRoleKey,
          });
          result.regulationsProcessed++;
          result.chunksCreated += chunksCreated;
        } catch (err) {
          result.errors.push(
            `Failed to embed "${regulation.title}": ${(err as Error).message}`
          );
        }
      }

      // Update jurisdiction last_scraped_at
      await supabase
        .from("jurisdictions")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", jurisdictionId);
    } catch (err) {
      result.errors.push(`Scraper error: ${(err as Error).message}`);
    }

    results.push(result);
  }

  return results;
}

/**
 * Run a targeted update for a specific state.
 */
export async function updateForState(state: string): Promise<UpdateResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { getScrapersForState } = await import("./scrapers");
  const scrapers = getScrapersForState(state);
  const results: UpdateResult[] = [];

  for (const scraper of scrapers) {
    const result: UpdateResult = {
      jurisdiction: scraper.name,
      regulationsProcessed: 0,
      chunksCreated: 0,
      errors: [],
    };

    try {
      const scraperResult = await scraper.scrape();

      const jurisdictionQuery = {
        level: scraperResult.jurisdictionLevel,
        state: scraperResult.state,
        county: scraperResult.county,
        city: scraperResult.city,
      };

      let { data: jurisdiction } = await supabase
        .from("jurisdictions")
        .select("id")
        .match(jurisdictionQuery)
        .single();

      if (!jurisdiction) {
        const { data: created } = await supabase
          .from("jurisdictions")
          .insert({ name: scraper.name, ...jurisdictionQuery })
          .select("id")
          .single();
        jurisdiction = created;
      }

      if (!jurisdiction) {
        result.errors.push("Could not find or create jurisdiction");
        results.push(result);
        continue;
      }

      for (const regulation of scraperResult.regulations) {
        try {
          const chunks = await embedRegulation({
            jurisdictionId: jurisdiction.id,
            regulation,
            supabaseUrl,
            serviceRoleKey,
          });
          result.regulationsProcessed++;
          result.chunksCreated += chunks;
        } catch (err) {
          result.errors.push(`"${regulation.title}": ${(err as Error).message}`);
        }
      }

      await supabase
        .from("jurisdictions")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", jurisdiction.id);
    } catch (err) {
      result.errors.push(`Scraper error: ${(err as Error).message}`);
    }

    results.push(result);
  }

  return results;
}
